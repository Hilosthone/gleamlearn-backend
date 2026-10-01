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
import { FinanceModule } from './finance/finance.module.js';
import { AdminSubscriptionsModule } from './subscriptions/subscriptions.module.js';
import { GamificationModule } from './gamification/gamification.module.js';
import { AdminNotificationsModule } from './notifications/notifications.module.js';
import { AdminRolesModule } from './roles/roles.module.js';
import { AdminAuditModule } from './audit/audit.module.js';
import { AdminSettingsModule } from './settings/settings.module.js';
import { AdminSystemModule } from './system/system.module.js';
import { AdminSecurityModule } from './security/security.module.js';
import { AdminExportModule } from './export/admin-export.module.js';

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
    FinanceModule,
    AdminSubscriptionsModule,
    GamificationModule,
    AdminNotificationsModule,
    AdminRolesModule,
    AdminAuditModule,
    AdminSettingsModule,
    AdminSystemModule,
    AdminSecurityModule,
    AdminExportModule,
    
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
    FinanceModule,
    AdminSubscriptionsModule,
    GamificationModule,
    AdminNotificationsModule,
    AdminRolesModule,
    AdminAuditModule,
    AdminSettingsModule,
    AdminSystemModule,
    AdminSecurityModule,
    AdminExportModule,
  ],
})
export class AdminModule {}