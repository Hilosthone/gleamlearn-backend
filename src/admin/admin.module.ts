// src/admin/admin.module.ts
import { Module } from '@nestjs/common';
import { AdminAuthModule } from './auth/admin.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { AdminUsersModule } from './users/users.module.js';
import { ActivityModule } from './activity/activity.module.js';
import { AnalyticsModule } from './analytics/analytics.module.js';
import { AdminCoursesModule } from './courses/courses.module.js';
import { AdminQuestionsModule } from './questions/questions.module.js'; 
import { AiModerationModule } from './ai-moderation/ai-moderation.module.js';
import { ReportsModule } from './reports/reports.module.js';

@Module({
  imports: [
    AdminAuthModule,
    DashboardModule,
    AdminUsersModule,
    ActivityModule,
    AnalyticsModule,
    AdminCoursesModule,
    AdminQuestionsModule,
    AiModerationModule,
    ReportsModule,
  ],
  exports: [
    AdminAuthModule,
    DashboardModule,
    AdminUsersModule,
    ActivityModule,
    AnalyticsModule,
    AdminCoursesModule,
    AdminQuestionsModule,
    AiModerationModule,
    ReportsModule,
  ],
})
export class AdminModule {}