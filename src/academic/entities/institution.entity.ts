// // src/academic/entities/institution.entity.ts
// import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
// import { Faculty } from './faculty.entity.js';

// @Entity('institutions')
// export class Institution {
//   @PrimaryGeneratedColumn('uuid')
//   id: string;

//   @Column({ type: 'varchar', unique: true })
//   name: string;

//   @Column({ type: 'varchar' })
//   type: string; // 'Secondary' | 'University' | 'Institute'

//   @Column({ type: 'varchar', nullable: true })
//   state: string;

//   @Column({ type: 'varchar', nullable: true })
//   country: string;

//   @OneToMany(() => Faculty, (faculty) => faculty.institution, { cascade: true })
//   faculties: Faculty[];

//   @CreateDateColumn()
//   createdAt: Date;

//   @UpdateDateColumn()
//   updatedAt: Date;
// }

// src/academic/entities/institution.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { Faculty } from './faculty.entity.js';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  name: string;

  @Column({ type: 'varchar' })
  type: string; // 'Secondary' | 'University' | 'Institute'

  @Column({ type: 'varchar', nullable: true })
  state: string;

  @Column({ type: 'varchar', nullable: true })
  country: string;

  @OneToMany('Faculty', (faculty: Faculty) => faculty.institution, { cascade: true })
  faculties: Faculty[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}