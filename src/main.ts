//src/main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createGlobalValidationPipe, isRequestValidationEnabled } from './common/validation/global-validation.pipe.js';
import { corsOptionsFromEnv } from './common/security/cors.js';
import { trustProxySetting } from './common/security/trust-proxy.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Behind Render's proxy req.ip is the proxy unless the proxy hop is trusted (rate limits are keyed by it)
  const trustProxy = trustProxySetting(process.env);
  if (trustProxy !== false) app.getHttpAdapter().getInstance().set('trust proxy', trustProxy);

  // CORS_ORIGINS unset: every origin (unchanged); set it to restrict (see common/security/cors.ts)
  app.enableCors(corsOptionsFromEnv(process.env.CORS_ORIGINS));

  if (isRequestValidationEnabled()) {
    app.useGlobalPipes(createGlobalValidationPipe());
  }

  // Swagger API Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('gleamlearn API Documentation')
    .setDescription('The official backend API documentation for gleamlearn platform covering Authentication, User Profiles, Academic Structure, and Course Catalog Management')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 5000);
}
bootstrap();