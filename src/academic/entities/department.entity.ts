// // src/academic/entities/department.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { Faculty } from './faculty.entity.js';

// @Entity('departments')
// export class Department {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar' })
//   name: string; // e.g., 'Computer Science and Engineering'

//   @ManyToOne(() => Faculty, (faculty) => faculty.departments, { onDelete: 'CASCADE' })
//   faculty: Faculty;

//   @Column()
//   facultyId: string;

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }

// src/academic/entities/department.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Faculty } from './faculty.entity.js';

@Entity('departments')
export class Department {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  name: string; // e.g., 'Computer Science and Engineering'

  @ManyToOne('Faculty', (faculty: Faculty) => faculty.departments, { onDelete: 'CASCADE' })
  faculty: Faculty;

  @Column()
  facultyId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}