import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Role } from './entities/role.entity.js';
import { Permission } from './entities/permission.entity.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AssignPermissionsDto } from './dto/assign-permissions.dto.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  async findAllRoles() {
    const roles = await this.roleRepo.find({ relations: { permissions: true } });
    return { status: 'success', data: roles };
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (existing) {
      throw new ConflictException(`Role with name ${dto.name} already exists`);
    }
    const role = this.roleRepo.create(dto);
    const saved = await this.roleRepo.save(role);
    return { status: 'success', message: 'Role created successfully', data: saved };
  }

  async findRoleById(id: string) {
    const role = await this.roleRepo.findOne({ where: { id }, relations: { permissions: true } });
    if (!role) throw new NotFoundException(`Role with ID ${id} not found`);
    return { status: 'success', data: role };
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = (await this.findRoleById(id)).data;
    Object.assign(role, dto);
    const updated = await this.roleRepo.save(role);
    return { status: 'success', message: 'Role updated successfully', data: updated };
  }

  async deleteRole(id: string) {
    const role = (await this.findRoleById(id)).data;
    await this.roleRepo.remove(role);
    return { status: 'success', message: 'Role deleted successfully' };
  }

  async findAllPermissions() {
    const permissions = await this.permissionRepo.find();
    return { status: 'success', data: permissions };
  }

  async assignPermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = (await this.findRoleById(roleId)).data;
    const permissions = await this.permissionRepo.findBy({ id: In(dto.permissionIds) });

    // Merge without duplicates
    const existingIds = new Set(role.permissions.map((p) => p.id));
    const newPermissions = permissions.filter((p) => !existingIds.has(p.id));

    role.permissions = [...role.permissions, ...newPermissions];
    const updated = await this.roleRepo.save(role);

    return { status: 'success', message: 'Permissions assigned successfully', data: updated };
  }

  async removePermissions(roleId: string, dto: AssignPermissionsDto) {
    const role = (await this.findRoleById(roleId)).data;
    const removeIds = new Set(dto.permissionIds);

    role.permissions = role.permissions.filter((p) => !removeIds.has(p.id));
    const updated = await this.roleRepo.save(role);

    return { status: 'success', message: 'Permissions revoked successfully', data: updated };
  }
}