// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { MailModule } from './mail/mail.module.js'; // <-- Import MailModule
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
import { QuestionsModule } from './questions/questions.module.js';
import {QuizzesModule} from './quizzes/quizzes.module.js';
import { TestsModule } from './tests/tests.module.js';
import { ExamsModule } from './exams/exams.module.js';
import { ExamPrepModule } from './exam-prep/exam-prep.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { GoalsModule } from './goals/goals.module.js';
import { PlannerModule } from './planner/planner.module.js';
import { StudySessionsModule } from './study-sessions/study-sessions.module.js';
import { StreakModule } from './streak/streak.module.js';
import { XpModule } from './xp/xp.module.js';
import { CoinsModule } from './coins/coins.module.js';
import { GamificationModule } from './gamification/gamification.module.js';
import { LeaderboardsModule } from './leaderboards/leaderboards.module.js';
import { PersonalAiModule } from './personal-ai/personal-ai.module.js';
import { PersonalAiCompanionModule } from './personal-ai-companion/personal-ai-companion.module.js';
import { AiTutorModule } from './ai-tutor/ai_tutor_module.js';
import { AiVoiceModule } from './ai-voice/ai-voice.module.js';
import { RecommendationsModule } from './recommendations/recommendations.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { CalendarModule } from './calendar/calendar.module.js';
import { SearchModule } from './search/search.module.js';

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
    MailModule, // <-- Register MailModule here
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
    QuestionsModule,
    QuizzesModule,
    TestsModule,
    ExamsModule,
    ExamPrepModule,
    AnalyticsModule,
    ProgressModule,
    GoalsModule,
    PlannerModule,
    StudySessionsModule,
    StreakModule,
    XpModule,
    CoinsModule,
    GamificationModule,
    LeaderboardsModule,
    PersonalAiModule,
    PersonalAiCompanionModule,
    AiTutorModule,
    AiVoiceModule,
    RecommendationsModule,
    NotificationsModule,
    CalendarModule,
    SearchModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}