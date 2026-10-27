import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Post,
  Put,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { Column, Entity, PrimaryColumn, Repository, UpdateDateColumn } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StorageModule } from '../storage/storage.module.js';
import { StorageService } from '../storage/storage.service.js';
import { AVATAR_MAX_BYTES, AVATAR_TYPES, detectFileType } from '../storage/file-signature.js';
import { withTable } from '../common/errors/missing-table.js';

/** The illustrated avatars a learner can pick (drawn by the web app; the server only stores the id). */
export const AVATAR_PRESETS = ['owl', 'rocket', 'atom', 'book', 'globe', 'palette', 'music', 'leaf', 'lion', 'star', 'robot', 'compass'] as const;

const FEATURE = 'Profile pictures';
const IMAGE_LINK_TTL_SECONDS = 60 * 60;

/** One row per learner who chose a picture; no row = the default avatar. Table added by 2026-10-27_learner_content.sql. */
@Entity('user_avatars')
export class UserAvatar {
  @PrimaryColumn('uuid')
  userId: string;

  @Column({ type: 'varchar', length: 10 })
  kind: 'preset' | 'upload';

  @Column({ type: 'varchar', length: 40, nullable: true })
  presetId: string | null;

  /** Private storage key (never a public URL). */
  @Column({ type: 'varchar', length: 500, nullable: true })
  storageKey: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  mimeType: string | null;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}

export class ChoosePresetDto {
  @IsString()
  @IsIn(AVATAR_PRESETS as unknown as string[])
  presetId: string;
}

export type AvatarView =
  | { kind: 'default' }
  | { kind: 'preset'; presetId: string }
  | { kind: 'upload'; imageUrl: string; expiresAt: string };

@Injectable()
export class AvatarsService {
  constructor(
    @InjectRepository(UserAvatar) private readonly repo: Repository<UserAvatar>,
    private readonly storage: StorageService,
  ) {}

  private view(row: UserAvatar | null): AvatarView {
    if (!row) return { kind: 'default' };
    if (row.kind === 'preset' && row.presetId) return { kind: 'preset', presetId: row.presetId };
    if (row.kind === 'upload' && row.storageKey) {
      const { url, expiresAt } = this.storage.signedUrl(row.storageKey, IMAGE_LINK_TTL_SECONDS, row.mimeType ?? 'image/png');
      return { kind: 'upload', imageUrl: url, expiresAt };
    }
    return { kind: 'default' };
  }

  get(userId: string): Promise<AvatarView> {
    return withTable(FEATURE, async () => this.view(await this.repo.findOne({ where: { userId } })));
  }

  choosePreset(userId: string, presetId: string): Promise<AvatarView> {
    return withTable(FEATURE, async () => {
      const previous = await this.repo.findOne({ where: { userId } });
      const saved = await this.repo.save({ userId, kind: 'preset', presetId, storageKey: null, mimeType: null });
      if (previous?.storageKey) await this.storage.remove(previous.storageKey);
      return this.view(saved as UserAvatar);
    });
  }

  async upload(userId: string, file: { buffer?: Buffer; size?: number } | undefined): Promise<AvatarView> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose an image to upload.');
    if (file.buffer.length > AVATAR_MAX_BYTES) throw new BadRequestException('The image must be 2 MB or smaller.');
    const type = detectFileType(file.buffer);
    // checked by content, not by the name or Content-Type the browser sent
    if (!type || !AVATAR_TYPES.includes(type.mime)) throw new BadRequestException('Upload a PNG, JPEG or WebP image.');
    return withTable(FEATURE, async () => {
      const previous = await this.repo.findOne({ where: { userId } });
      const key = await this.storage.put('avatars', file.buffer!, type.ext);
      try {
        const saved = await this.repo.save({ userId, kind: 'upload', presetId: null, storageKey: key, mimeType: type.mime });
        if (previous?.storageKey) await this.storage.remove(previous.storageKey);
        return this.view(saved as UserAvatar);
      } catch (err) {
        await this.storage.remove(key); // no orphan if the record could not be saved
        throw err;
      }
    });
  }

  reset(userId: string): Promise<AvatarView> {
    return withTable(FEATURE, async () => {
      const previous = await this.repo.findOne({ where: { userId } });
      if (previous) {
        await this.repo.delete({ userId });
        if (previous.storageKey) await this.storage.remove(previous.storageKey);
      }
      return { kind: 'default' } as AvatarView;
    });
  }
}

/** The signed-in learner's own picture only: every route uses the token's user id, never an id from the request. */
@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/users/me')
export class AvatarsController {
  constructor(private readonly avatars: AvatarsService) {}

  @Get('avatar')
  get(@CurrentUser('id') userId: string) {
    return this.avatars.get(userId);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Put('avatar')
  choose(@CurrentUser('id') userId: string, @Body() dto: ChoosePresetDto) {
    return this.avatars.choosePreset(userId, dto.presetId);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: AVATAR_MAX_BYTES, files: 1 } }))
  upload(@CurrentUser('id') userId: string, @UploadedFile() file: { buffer?: Buffer; size?: number } | undefined) {
    return this.avatars.upload(userId, file);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Delete('profile-picture')
  reset(@CurrentUser('id') userId: string) {
    return this.avatars.reset(userId);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([UserAvatar]), StorageModule],
  controllers: [AvatarsController],
  providers: [AvatarsService],
})
export class AvatarsModule {}
