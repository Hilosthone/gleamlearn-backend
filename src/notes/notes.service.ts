// src/notes/notes.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NoteEntity } from './entities/note.entity.js';
import { CreateNoteDto } from './dto/create-note.dto.js';

@Injectable()
export class NotesService {
  constructor(
    @InjectRepository(NoteEntity) private noteRepo: Repository<NoteEntity>,
  ) {}

  async findAll(userId: string) {
    return this.noteRepo.find({ where: { userId }, order: { updatedAt: 'DESC' } });
  }

  async findOne(id: string, userId: string) {
    const note = await this.noteRepo.findOne({ where: { id, userId } });
    if (!note) throw new NotFoundException(`Note with ID ${id} not found`);
    return note;
  }

  async create(userId: string, dto: CreateNoteDto) {
    const newNote = this.noteRepo.create({ ...dto, userId });
    return this.noteRepo.save(newNote);
  }

  async update(id: string, userId: string, dto: Partial<CreateNoteDto>) {
    const note = await this.findOne(id, userId);
    Object.assign(note, dto);
    return this.noteRepo.save(note);
  }

  async remove(id: string, userId: string) {
    const note = await this.findOne(id, userId);
    await this.noteRepo.remove(note);
    return { status: 'success', message: `Note ${id} successfully deleted` };
  }
}