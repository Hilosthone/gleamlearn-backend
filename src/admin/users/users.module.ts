// // src/admin/users/users.module.ts
// import { Module } from '@nestjs/common';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { AdminUsersController } from './users.controller.js';
// import { AdminUsersService } from './users.service.js';
// import { User } from '../../auth/entities/user.entity.js';

// @Module({
//   imports: [TypeOrmModule.forFeature([User])],
//   controllers: [AdminUsersController],
//   providers: [AdminUsersService],
//   exports: [AdminUsersService],
// })
// export class AdminUsersModule {}


// src/admin/users/users.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminUsersController } from './users.controller.js';
import { AdminUsersService } from './users.service.js';
import { User } from '../../auth/entities/user.entity.js';
import { AdminUserAction } from './entities/admin-user-action.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([User, AdminUserAction])],
  controllers: [AdminUsersController],
  providers: [AdminUsersService],
  exports: [AdminUsersService],
})
export class AdminUsersModule {}