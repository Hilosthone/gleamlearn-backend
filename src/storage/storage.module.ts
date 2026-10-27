import { Controller, Get, Module, NotFoundException, Param, Res } from '@nestjs/common';
import type { Response } from 'express';
import { StorageService } from './storage.service.js';

/**
 * Serves locally stored uploads (STORAGE_DRIVER=local only) for a valid, unexpired signed token. No login: the token
 * itself is the permission, issued only to the owner by an owner-checked endpoint and valid for minutes.
 */
@Controller('api/v1/storage')
export class LocalStorageController {
  constructor(private readonly storage: StorageService) {}

  @Get('local/:token')
  serve(@Param('token') token: string, @Res() res: Response) {
    if (this.storage.driver() !== 'local') throw new NotFoundException();
    const found = this.storage.verifyLocalToken(token);
    if (!found) throw new NotFoundException('This link is invalid or has expired.');
    res.setHeader('Content-Type', found.mime);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, max-age=60');
    res.sendFile(found.filePath, (err) => {
      if (err && !res.headersSent) res.status(404).json({ statusCode: 404, message: 'Not found' });
    });
  }
}

@Module({
  controllers: [LocalStorageController],
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
