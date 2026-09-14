// // src/app.module.ts
// import { Module } from '@nestjs/common';
// import { ConfigModule, ConfigService } from '@nestjs/config';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { AppController } from './app.controller.js';
// import { AppService } from './app.service.js';
// import { AuthModule } from './auth/auth.module.js';
// import { UsersModule } from './users/users.module.js';
// import { AcademicModule } from './academic/academic.module.js'; 
// import { CoursesModule } from './courses/courses.module.js'; 
// import { LibraryModule } from './library/library.module.js';
// import { FilesModule } from './files/files.module.js';
// import { AiModule } from './ai/ai.module.js';
// import { User } from './auth/entities/user.entity.js';

// @Module({
//   imports: [
//     ConfigModule.forRoot({ isGlobal: true }),
//     TypeOrmModule.forRootAsync({
//       imports: [ConfigModule],
//       inject: [ConfigService],
//       useFactory: (configService: ConfigService) => {
//         const databaseUrl = configService.get<string>('DATABASE_URL');

//         if (databaseUrl && databaseUrl.includes('supabase.co')) {
//           return {
//             type: 'postgres' as const,
//             url: databaseUrl,
//             entities: [User],
//             autoLoadEntities: true, 
//             synchronize: true,
//             ssl: {
//               rejectUnauthorized: false, // Required strictly for Supabase cloud
//             },
//           };
//         }

//         return {
//           type: 'postgres' as const,
//           host: configService.get<string>('DATABASE_HOST', 'localhost'),
//           port: parseInt(configService.get<string>('DATABASE_PORT', '5432'), 10),
//           username: configService.get<string>('DATABASE_USER', 'postgres'),
//           password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
//           database: configService.get<string>('DATABASE_NAME', 'mycoursea_db'),
//           entities: [User],
//           autoLoadEntities: true,
//           synchronize: true,
//           // No SSL property here for local PostgreSQL
//         };
//       },
//     }),
//     AuthModule,
//     UsersModule,
//     AcademicModule,
//     CoursesModule, 
//     LibraryModule,
//     FilesModule,
//     AiModule,
//   ],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}


// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AcademicModule } from './academic/academic.module.js'; 
import { CoursesModule } from './courses/courses.module.js'; 
import { LibraryModule } from './library/library.module.js';
import { FilesModule } from './files/files.module.js';
import { AiModule } from './ai/ai.module.js';
import { NotesModule } from './notes/notes.module.js';
import { LessonsModule } from './lessons/lessons.module.js';
import { FlashcardsModule } from './flashcards/flashcards.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');

        if (databaseUrl && databaseUrl.includes('supabase.co')) {
          return {
            type: 'postgres' as const,
            url: databaseUrl,
            autoLoadEntities: true, 
            synchronize: true,
            ssl: {
              rejectUnauthorized: false,
            },
          };
        }

        return {
          type: 'postgres' as const,
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: parseInt(configService.get<string>('DATABASE_PORT', '5432'), 10),
          username: configService.get<string>('DATABASE_USER', 'postgres'),
          password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: configService.get<string>('DATABASE_NAME', 'mycoursea_db'),
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    AuthModule,
    UsersModule,
    AcademicModule,
    CoursesModule, 
    LibraryModule,
    FilesModule,
    AiModule,
    NotesModule,
    LessonsModule,
    FlashcardsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}