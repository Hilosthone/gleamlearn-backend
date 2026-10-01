import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RolesController } from './roles.controller.js';
import { RolesService } from './roles.service.js';
import { Role } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([Role, Permission])],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService],
})
export class AdminRolesModule {}