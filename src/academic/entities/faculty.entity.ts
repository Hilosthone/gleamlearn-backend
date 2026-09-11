// // src/academic/entities/faculty.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { Institution } from './institution.entity.js';
// import { Department } from './department.entity.js';

// @Entity('faculties')
// export class Faculty {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar' })
//   name: string; // e.g., 'Faculty of Technology'

//   @ManyToOne(() => Institution, (institution) => institution.faculties, { onDelete: 'CASCADE' })
//   institution: Institution;

//   @Column()
//   institutionId: string;

//   @OneToMany(() => Department, (department) => department.faculty, { cascade: true })
//   departments: Department[];

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }

// src/academic/entities/faculty.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Institution } from './institution.entity.js';
import type { Department } from './department.entity.js';

@Entity('faculties')
export class Faculty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string; // e.g., 'Faculty of Technology'

  @ManyToOne('Institution', (institution: Institution) => institution.faculties, { onDelete: 'CASCADE' })
  institution: Institution;

  @Column()
  institutionId: string;

  @OneToMany('Department', (department: Department) => department.faculty, { cascade: true })
  departments: Department[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}