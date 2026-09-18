// // src/gamification/gamification.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';

// // Entities
// import { Achievement } from './entities/achievement.entity.js';
// import { UserAchievement } from './entities/user-achievement.entity.js';
// import { Badge } from './entities/badge.entity.js';
// import { UserBadge } from './entities/user-badge.entity.js';

// // Services
// import { LevelsService } from './services/levels.service.js';
// import { AchievementsService } from './services/achievements.service.js';
// import { BadgesService } from './services/badges.service.js';

// // Controllers
// import { LevelsController } from './controllers/levels.controller.js';
// import { AchievementsController } from './controllers/achievements.controller.js';
// import { BadgesController } from './controllers/badges.controller.js';

// // Dependencies
// import { XpModule } from '../xp/xp.module.js';

// @Module({
//   imports: [
//     TypeOrmModule.forFeature([
//       Achievement,
//       UserAchievement,
//       Badge,
//       UserBadge,
//     ]),
//     XpModule,
//   ],
//   controllers: [
//     LevelsController,
//     AchievementsController,
//     BadgesController,
//   ],
//   providers: [
//     LevelsService,
//     AchievementsService,
//     BadgesService,
//   ],
//   exports: [
//     AchievementsService,
//     BadgesService,
//   ],
// })
// export class GamificationModule {}

// src/gamification/gamification.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Achievement } from './entities/achievement.entity.js';
import { UserAchievement } from './entities/user-achievement.entity.js';
import { Badge } from './entities/badge.entity.js';
import { UserBadge } from './entities/user-badge.entity.js';
import { XpTransaction } from '../xp/entities/xp-transaction.entity.js'; // Import XP Entity

import { LevelsService } from './services/levels.service.js';
import { AchievementsService } from './services/achievements.service.js';
import { BadgesService } from './services/badges.service.js';

import { LevelsController } from './controllers/levels.controller.js';
import { AchievementsController } from './controllers/achievements.controller.js';
import { BadgesController } from './controllers/badges.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Achievement,
      UserAchievement,
      Badge,
      UserBadge,
      XpTransaction, // Added here so LevelsService can query it
    ]),
  ],
  controllers: [
    LevelsController,
    AchievementsController,
    BadgesController,
  ],
  providers: [
    LevelsService,
    AchievementsService,
    BadgesService,
  ],
  exports: [
    AchievementsService,
    BadgesService,
  ],
})
export class GamificationModule {}