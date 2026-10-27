import {
  BadRequestException,
  ConflictException,
  Logger,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsBoolean, IsIn, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { In, IsNull, Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { StorageModule } from '../storage/storage.module.js';
import { StorageService } from '../storage/storage.service.js';
import { MATERIAL_MAX_BYTES, MATERIAL_TYPES, detectFileType } from '../storage/file-signature.js';
import { withTable } from '../common/errors/missing-table.js';
import { featureUnavailable } from '../common/errors/feature-unavailable.js';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';
import { LearnerMaterial, PersonalCourse, PersonalCourseModule } from './entities.js';

const COURSES = 'Personal courses';
const MATERIALS = 'Uploaded materials';
const MAX_COURSES = 50;
const MAX_MODULES = 100;
const MAX_MATERIALS = 200;
const DOWNLOAD_LINK_TTL_SECONDS = 5 * 60;
const MAX_TEXT_CHARS = 200_000;

// ---------------------------------------------------------------------------------------------------------------
// DTOs
// ---------------------------------------------------------------------------------------------------------------

export class PersonalCourseDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  subjects?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  level?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  examGoals?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(300, { each: true })
  objectives?: string[];
}

export class UpdatePersonalCourseDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(2000) description?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(60, { each: true }) subjects?: string[];
  @IsOptional() @IsString() @MaxLength(100) level?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(10) @IsString({ each: true }) @MaxLength(60, { each: true }) examGoals?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) @MaxLength(300, { each: true }) objectives?: string[];
  @IsOptional() @IsBoolean() archived?: boolean;
}

export class ModuleDto {
  @IsString() @MinLength(1) @MaxLength(200) title: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
}

export class UpdateModuleDto {
  @IsOptional() @IsString() @MinLength(1) @MaxLength(200) title?: string;
  @IsOptional() @IsString() @MaxLength(20000) notes?: string;
  @IsOptional() @IsBoolean() isCompleted?: boolean;
}

export class MaterialUploadDto {
  @IsOptional() @IsUUID() personalCourseId?: string;
}

export class MaterialTextDto {
  @IsString() @MaxLength(255) title: string;
  @IsString() @MinLength(1) @MaxLength(200000) text: string;
  @IsOptional() @IsUUID() personalCourseId?: string;
}

const tidyList = (v: string[] | undefined) => Array.from(new Set((v ?? []).map((s) => s.trim()).filter(Boolean)));
const tidy = (v: string | undefined) => (v === undefined ? undefined : v.trim() || null);

// ---------------------------------------------------------------------------------------------------------------
// Services
// ---------------------------------------------------------------------------------------------------------------

export interface MaterialView {
  id: string;
  personalCourseId: string | null;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  sourceType: string;
  status: string;
  textChars: number;
  processingError: string | null;
  createdAt: Date;
}

/** A PROCESSING row older than this was interrupted (e.g. a restart) and is reported as failed, retryable. */
const STALE_PROCESSING_MS = 10 * 60_000;

const materialView = (m: LearnerMaterial): MaterialView => {
  const stale = m.status === 'PROCESSING' && !!m.updatedAt && Date.now() - new Date(m.updatedAt).getTime() > STALE_PROCESSING_MS;
  return {
    id: m.id,
    personalCourseId: m.personalCourseId,
    originalName: m.originalName,
    mimeType: m.mimeType,
    sizeBytes: m.sizeBytes,
    sourceType: m.sourceType ?? 'upload',
    status: stale ? 'FAILED' : m.status,
    textChars: m.textChars ?? 0,
    processingError: stale ? 'Processing was interrupted. Try again.' : (m.processingError ?? null),
    createdAt: m.createdAt,
  };
}; // storageKey and extractedText are never returned in lists

/** The learner-facing message for a failed extraction (the AI service's coded messages, or a generic one). */
function extractionError(err: unknown): string {
  const ex = toAiHttpException(err, 'material text extraction');
  const body = ex.getResponse() as { message?: string } | string;
  const message = typeof body === 'string' ? body : body?.message;
  return typeof message === 'string' && message ? message : 'The text could not be extracted. Try again.';
}

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  constructor(
    @InjectRepository(LearnerMaterial) private readonly repo: Repository<LearnerMaterial>,
    @InjectRepository(PersonalCourse) private readonly courses: Repository<PersonalCourse>,
    private readonly storage: StorageService,
  ) {}

  private async own(userId: string, id: string): Promise<LearnerMaterial> {
    const m = await this.repo.findOne({ where: { id, userId } });
    if (!m) throw new NotFoundException('Material not found.'); // also for other learners' files: no existence leak
    return m;
  }

  private async checkCourse(userId: string, personalCourseId?: string) {
    if (personalCourseId && !(await this.courses.findOne({ where: { id: personalCourseId, userId } }))) {
      throw new NotFoundException('Course not found.');
    }
  }

  private async checkQuota(userId: string) {
    if ((await this.repo.count({ where: { userId } })) >= MAX_MATERIALS) {
      throw new BadRequestException(`You can keep up to ${MAX_MATERIALS} materials. Delete some to add more.`);
    }
  }

  list(userId: string, personalCourseId?: string): Promise<MaterialView[]> {
    return withTable(MATERIALS, async () => {
      const rows = await this.repo.find({ where: { userId, ...(personalCourseId ? { personalCourseId } : {}) }, order: { createdAt: 'DESC' } });
      return rows.map(materialView);
    });
  }

  get(userId: string, id: string): Promise<MaterialView> {
    return withTable(MATERIALS, async () => materialView(await this.own(userId, id)));
  }

  /** Stores the file, then extracts its text in the background (status PROCESSING → READY or FAILED). */
  async upload(userId: string, file: { buffer?: Buffer; originalname?: string } | undefined, personalCourseId?: string): Promise<MaterialView> {
    if (!file?.buffer?.length) throw new BadRequestException('Choose a file to upload.');
    if (file.buffer.length > MATERIAL_MAX_BYTES) throw new BadRequestException('The file must be 15 MB or smaller.');
    const type = detectFileType(file.buffer);
    if (!type || !MATERIAL_TYPES.includes(type.mime)) throw new BadRequestException('Upload a PDF, Word (.docx) or plain-text file.');
    const name = (file.originalname ?? '').replace(/[\\/\u0000-\u001f]/g, '').trim().slice(0, 255) || `material.${type.ext}`;
    return withTable(MATERIALS, async () => {
      await this.checkCourse(userId, personalCourseId);
      await this.checkQuota(userId);
      const key = await this.storage.put('materials', file.buffer!, type.ext);
      let saved: LearnerMaterial;
      try {
        saved = await this.repo.save(
          this.repo.create({
            userId,
            personalCourseId: personalCourseId ?? null,
            originalName: name,
            mimeType: type.mime,
            sizeBytes: file.buffer!.length,
            storageKey: key,
            sourceType: 'upload',
            status: 'PROCESSING',
          }),
        );
      } catch (err) {
        await this.storage.remove(key);
        throw err;
      }
      void this.extract(saved.id, file.buffer!, type.mime, name); // not awaited: the learner sees PROCESSING and polls
      return materialView(saved);
    });
  }

  /** Pasted text becomes a material directly (no file, no AI call). */
  async addText(userId: string, title: string, text: string, personalCourseId?: string): Promise<MaterialView> {
    const clean = text.replace(/\r\n?/g, '\n').replace(/\u0000/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (clean.length < 20) throw new BadRequestException('Paste at least a few sentences to learn from.');
    if (clean.length > MAX_TEXT_CHARS) throw new BadRequestException('Pasted text can be up to 200,000 characters.');
    return withTable(MATERIALS, async () => {
      await this.checkCourse(userId, personalCourseId);
      await this.checkQuota(userId);
      const saved = await this.repo.save(
        this.repo.create({
          userId,
          personalCourseId: personalCourseId ?? null,
          originalName: title.trim().slice(0, 255) || 'Pasted text',
          mimeType: 'text/plain',
          sizeBytes: Buffer.byteLength(clean),
          storageKey: null,
          sourceType: 'text',
          status: 'READY',
          extractedText: clean,
          textChars: clean.length,
        }),
      );
      return materialView(saved);
    });
  }

  /** Retry: only for a FAILED (or interrupted) upload; reads the stored file again. */
  process(userId: string, id: string): Promise<MaterialView> {
    return withTable(MATERIALS, async () => {
      const m = await this.own(userId, id);
      const view = materialView(m);
      if (view.status === 'READY') return view;
      if (view.status === 'PROCESSING') throw new ConflictException('This file is still being processed.');
      if (!m.storageKey) throw new BadRequestException('This material has no file to process.');
      const data = await this.storage.read(m.storageKey);
      await this.repo.update({ id: m.id, userId }, { status: 'PROCESSING', processingError: null });
      void this.extract(m.id, data, m.mimeType, m.originalName);
      return { ...view, status: 'PROCESSING', processingError: null };
    });
  }

  async extract(id: string, data: Buffer, mimeType: string, filename: string): Promise<void> {
    try {
      const res = await getAiHttpClient().post('/api/v1/learn/extract', { fileBase64: data.toString('base64'), mimeType, filename });
      const text = typeof res.data?.text === 'string' ? res.data.text : '';
      if (!text.trim()) throw new Error('empty extraction');
      await this.repo.update({ id }, { status: 'READY', extractedText: text, textChars: text.length, processingError: null });
    } catch (err) {
      const message = extractionError(err);
      this.logger.warn(`material ${id} extraction failed: ${message}`); // never the file contents
      await this.repo.update({ id }, { status: 'FAILED', processingError: message }).catch(() => undefined);
    }
  }

  /** The material's text, for its owner (and for generation). */
  text(userId: string, id: string): Promise<{ id: string; title: string; text: string; personalCourseId: string | null }> {
    return withTable(MATERIALS, async () => {
      const m = await this.repo.findOne({ where: { id, userId }, select: { id: true, originalName: true, status: true, extractedText: true, personalCourseId: true } });
      if (!m) throw new NotFoundException('Material not found.');
      if (m.status !== 'READY' || !m.extractedText) throw new ConflictException('This material has no readable text yet.');
      return { id: m.id, title: m.originalName, text: m.extractedText, personalCourseId: m.personalCourseId };
    });
  }

  access(userId: string, id: string) {
    return withTable(MATERIALS, async () => {
      const m = await this.own(userId, id);
      if (!m.storageKey) throw new NotFoundException('This material is pasted text; it has no file to download.');
      return { ...this.storage.signedUrl(m.storageKey, DOWNLOAD_LINK_TTL_SECONDS, m.mimeType), originalName: m.originalName, mimeType: m.mimeType };
    });
  }

  remove(userId: string, id: string) {
    return withTable(MATERIALS, async () => {
      const m = await this.own(userId, id);
      await this.repo.delete({ id: m.id, userId });
      if (m.storageKey) await this.storage.remove(m.storageKey);
      return { deleted: true };
    });
  }

  /** Materials of a deleted course stay in the library. */
  detachCourse(userId: string, courseId: string) {
    return this.repo.update({ userId, personalCourseId: courseId }, { personalCourseId: null });
  }

  countsByCourse(userId: string, courseIds: string[]): Promise<Map<string, number>> {
    if (courseIds.length === 0) return Promise.resolve(new Map());
    return this.repo
      .createQueryBuilder('m')
      .select('m.personalCourseId', 'courseId')
      .addSelect('COUNT(*)', 'n')
      .where('m.userId = :userId AND m.personalCourseId IN (:...ids)', { userId, ids: courseIds })
      .groupBy('m.personalCourseId')
      .getRawMany<{ courseId: string; n: string }>()
      .then((rows) => new Map(rows.map((r) => [r.courseId, Number(r.n)])));
  }
}

@Injectable()
export class PersonalCoursesService {
  constructor(
    @InjectRepository(PersonalCourse) private readonly repo: Repository<PersonalCourse>,
    @InjectRepository(PersonalCourseModule) private readonly modules: Repository<PersonalCourseModule>,
    private readonly materials: MaterialsService,
  ) {}

  private async own(userId: string, id: string): Promise<PersonalCourse> {
    const c = await this.repo.findOne({ where: { id, userId } });
    if (!c) throw new NotFoundException('Course not found.');
    return c;
  }

  list(userId: string, includeArchived = false) {
    return withTable(COURSES, async () => {
      const courses = await this.repo.find({ where: { userId, ...(includeArchived ? {} : { archivedAt: IsNull() }) }, order: { updatedAt: 'DESC' } });
      const ids = courses.map((c) => c.id);
      const mods = ids.length ? await this.modules.find({ where: { courseId: In(ids), userId }, select: { courseId: true, isCompleted: true } }) : [];
      const files = await this.materials.countsByCourse(userId, ids);
      return courses.map((c) => {
        const own = mods.filter((m) => m.courseId === c.id);
        return { ...c, moduleCount: own.length, completedModules: own.filter((m) => m.isCompleted).length, materialCount: files.get(c.id) ?? 0 };
      });
    });
  }

  get(userId: string, id: string) {
    return withTable(COURSES, async () => {
      const course = await this.own(userId, id);
      const modules = await this.modules.find({ where: { courseId: id, userId }, order: { position: 'ASC', createdAt: 'ASC' } });
      const materials = await this.materials.list(userId, id);
      return { ...course, modules, materials };
    });
  }

  create(userId: string, dto: PersonalCourseDto) {
    return withTable(COURSES, async () => {
      if ((await this.repo.count({ where: { userId } })) >= MAX_COURSES) throw new BadRequestException(`You can have up to ${MAX_COURSES} personal courses.`);
      return this.repo.save(
        this.repo.create({ userId, title: dto.title.trim(), description: tidy(dto.description) ?? null, subjects: tidyList(dto.subjects), level: tidy(dto.level) ?? null, examGoals: tidyList(dto.examGoals), objectives: tidyList(dto.objectives) }),
      );
    });
  }

  update(userId: string, id: string, dto: UpdatePersonalCourseDto) {
    return withTable(COURSES, async () => {
      const course = await this.own(userId, id);
      // only these fields; ids and owner cannot be changed from the body
      if (dto.title !== undefined) course.title = dto.title.trim();
      if (dto.description !== undefined) course.description = tidy(dto.description) ?? null;
      if (dto.level !== undefined) course.level = tidy(dto.level) ?? null;
      if (dto.subjects !== undefined) course.subjects = tidyList(dto.subjects);
      if (dto.examGoals !== undefined) course.examGoals = tidyList(dto.examGoals);
      if (dto.objectives !== undefined) course.objectives = tidyList(dto.objectives);
      if (dto.archived !== undefined) course.archivedAt = dto.archived ? (course.archivedAt ?? new Date()) : null;
      return this.repo.save(course);
    });
  }

  remove(userId: string, id: string) {
    return withTable(COURSES, async () => {
      const course = await this.own(userId, id);
      await this.modules.delete({ courseId: course.id, userId });
      await this.materials.detachCourse(userId, course.id);
      await this.repo.delete({ id: course.id, userId });
      return { deleted: true };
    });
  }

  addModule(userId: string, courseId: string, dto: ModuleDto) {
    return withTable(COURSES, async () => {
      await this.own(userId, courseId);
      const count = await this.modules.count({ where: { courseId, userId } });
      if (count >= MAX_MODULES) throw new BadRequestException(`A course can have up to ${MAX_MODULES} modules.`);
      const saved = await this.modules.save(this.modules.create({ courseId, userId, title: dto.title.trim(), notes: tidy(dto.notes) ?? null, position: count }));
      await this.repo.update({ id: courseId, userId }, { updatedAt: new Date() });
      return saved;
    });
  }

  updateModule(userId: string, courseId: string, moduleId: string, dto: UpdateModuleDto) {
    return withTable(COURSES, async () => {
      const mod = await this.modules.findOne({ where: { id: moduleId, courseId, userId } });
      if (!mod) throw new NotFoundException('Module not found.');
      if (dto.title !== undefined) mod.title = dto.title.trim();
      if (dto.notes !== undefined) mod.notes = tidy(dto.notes) ?? null;
      if (dto.isCompleted !== undefined) mod.isCompleted = dto.isCompleted;
      return this.modules.save(mod);
    });
  }

  removeModule(userId: string, courseId: string, moduleId: string) {
    return withTable(COURSES, async () => {
      const res = await this.modules.delete({ id: moduleId, courseId, userId });
      if (!res.affected) throw new NotFoundException('Module not found.');
      return { deleted: true };
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Controllers — the learner's own records only (ids from the token, never from the body)
// ---------------------------------------------------------------------------------------------------------------

@ApiTags('Personal courses')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/personal-courses')
export class PersonalCoursesController {
  constructor(private readonly courses: PersonalCoursesService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('archived') archived?: string) {
    return this.courses.list(userId, archived === 'true');
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Post()
  create(@CurrentUser('id') userId: string, @Body() dto: PersonalCourseDto) {
    return this.courses.create(userId, dto);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.get(userId, id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 30, ttl: 60000 } })
  @Patch(':id')
  update(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePersonalCourseDto) {
    return this.courses.update(userId, id, dto);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.courses.remove(userId, id);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 40, ttl: 60000 } })
  @Post(':id/modules')
  addModule(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ModuleDto) {
    return this.courses.addModule(userId, id, dto);
  }

  @Throttle({ short: { limit: 3, ttl: 2000 }, long: { limit: 60, ttl: 60000 } })
  @Patch(':id/modules/:moduleId')
  updateModule(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('moduleId', ParseUUIDPipe) moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.courses.updateModule(userId, id, moduleId, dto);
  }

  @Throttle({ short: { limit: 2, ttl: 2000 }, long: { limit: 30, ttl: 60000 } })
  @Delete(':id/modules/:moduleId')
  removeModule(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string, @Param('moduleId', ParseUUIDPipe) moduleId: string) {
    return this.courses.removeModule(userId, id, moduleId);
  }
}

@ApiTags('Uploaded materials')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/materials')
export class MaterialsController {
  constructor(private readonly materials: MaterialsService) {}

  @Get()
  list(@CurrentUser('id') userId: string, @Query('personalCourseId') personalCourseId?: string) {
    if (personalCourseId !== undefined && !/^[0-9a-f-]{36}$/i.test(personalCourseId)) throw new BadRequestException('personalCourseId must be a UUID.');
    return this.materials.list(userId, personalCourseId);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MATERIAL_MAX_BYTES, files: 1 } }))
  upload(@CurrentUser('id') userId: string, @UploadedFile() file: { buffer?: Buffer; originalname?: string } | undefined, @Body() dto: MaterialUploadDto) {
    return this.materials.upload(userId, file, dto.personalCourseId);
  }


  @Throttle({ short: { limit: 3, ttl: 2000 }, long: { limit: 60, ttl: 60000 } })
  @Get(':id/access')
  access(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.materials.access(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 20, ttl: 60000 } })
  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.materials.remove(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 2000 }, long: { limit: 15, ttl: 60000 } })
  @Post('text')
  addText(@CurrentUser('id') userId: string, @Body() dto: MaterialTextDto) {
    return this.materials.addText(userId, dto.title, dto.text, dto.personalCourseId);
  }

  @Get(':id')
  get(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.materials.get(userId, id);
  }

  @Get(':id/text')
  text(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.materials.text(userId, id);
  }

  @Throttle({ short: { limit: 1, ttl: 3000 }, long: { limit: 10, ttl: 60000 } })
  @Post(':id/process')
  process(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.materials.process(userId, id);
  }
}

@Module({
  imports: [TypeOrmModule.forFeature([PersonalCourse, PersonalCourseModule, LearnerMaterial]), StorageModule],
  controllers: [PersonalCoursesController, MaterialsController],
  providers: [PersonalCoursesService, MaterialsService],
})
export class LearnerContentModule {}
