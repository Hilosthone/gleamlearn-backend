import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';
import { MAIL_TRANSPORT } from './mail-transport.js';
import { createMailTransport } from './mail-transport.factory.js';

@Module({
  imports: [ConfigModule],
  providers: [
    MailService,
    {
      // Resend or SMTP, chosen once at startup from configuration (see mail-transport.factory.ts)
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createMailTransport((name) => config.get<string>(name)),
    },
  ],
  exports: [MailService],
})
export class MailModule {}
