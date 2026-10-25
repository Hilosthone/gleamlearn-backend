//src/main.ts
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { createGlobalValidationPipe, isRequestValidationEnabled } from './common/validation/global-validation.pipe.js';
import { corsOptionsFromEnv } from './common/security/cors.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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