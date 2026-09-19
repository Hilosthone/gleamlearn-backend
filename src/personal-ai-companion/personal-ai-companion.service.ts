// // src/personal-ai-companion/personal-ai-companion.service.ts
// import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { AiCompanion } from './entities/ai-companion.entity.js';
// import { UpsertAiCompanionDto } from './dto/ai-companion.dto.js';

// @Injectable()
// export class PersonalAiCompanionService {
//   constructor(
//     @InjectRepository(AiCompanion)
//     private readonly companionRepo: Repository<AiCompanion>,
//   ) {}

//   async getCompanion(userId: string) {
//     let companion = await this.companionRepo.findOne({ where: { userId } });
//     if (!companion) {
//       // Default companion initialization if none exists yet
//       companion = this.companionRepo.create({ userId });
//       await this.companionRepo.save(companion);
//     }
//     return { status: 'success', data: companion };
//   }

//   async createCompanion(userId: string, dto: UpsertAiCompanionDto) {
//     const existing = await this.companionRepo.findOne({ where: { userId } });
//     if (existing) {
//       throw new HttpException('Companion profile already exists. Use PATCH to update.', HttpStatus.CONFLICT);
//     }
//     const companion = this.companionRepo.create({ userId, ...dto });
//     await this.companionRepo.save(companion);
//     return { status: 'success', message: 'Companion created successfully', data: companion };
//   }

//   async updateCompanion(userId: string, dto: UpsertAiCompanionDto) {
//     let companion = await this.companionRepo.findOne({ where: { userId } });
//     if (!companion) {
//       companion = this.companionRepo.create({ userId, ...dto });
//     } else {
//       Object.assign(companion, dto);
//     }
//     await this.companionRepo.save(companion);
//     return { status: 'success', message: 'Companion updated successfully', data: companion };
//   }

//   async deleteCompanion(userId: string) {
//     const companion = await this.companionRepo.findOne({ where: { userId } });
//     if (!companion) {
//       throw new HttpException('Companion profile not found', HttpStatus.NOT_FOUND);
//     }
//     await this.companionRepo.remove(companion);
//     return { status: 'success', message: 'Companion profile reset/deleted successfully' };
//   }
// }


// src/personal-ai-companion/personal-ai-companion.service.ts
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCompanion } from './entities/ai-companion.entity.js';
import { UpsertAiCompanionDto } from './dto/ai-companion.dto.js';

@Injectable()
export class PersonalAiCompanionService {
  constructor(
    @InjectRepository(AiCompanion)
    private readonly companionRepo: Repository<AiCompanion>,
  ) {}

  async getCompanion(userId: string) {
    let companion = await this.companionRepo.findOne({ where: { userId } });
    if (!companion) {
      // Default companion initialization if none exists yet
      companion = this.companionRepo.create({ userId });
      await this.companionRepo.save(companion);
    }
    return { status: 'success', data: companion };
  }

  async createCompanion(userId: string, dto: UpsertAiCompanionDto) {
    const existing = await this.companionRepo.findOne({ where: { userId } });
    if (existing) {
      throw new HttpException('Companion profile already exists. Use PATCH to update.', HttpStatus.CONFLICT);
    }
    const companion = this.companionRepo.create({ userId, ...dto });
    await this.companionRepo.save(companion);
    return { status: 'success', message: 'Companion created successfully', data: companion };
  }

  async updateCompanion(userId: string, dto: UpsertAiCompanionDto) {
    let companion = await this.companionRepo.findOne({ where: { userId } });
    if (!companion) {
      companion = this.companionRepo.create({ userId, ...dto });
    } else {
      Object.assign(companion, dto);
    }
    await this.companionRepo.save(companion);
    return { status: 'success', message: 'Companion updated successfully', data: companion };
  }

  async deleteCompanion(userId: string) {
    const companion = await this.companionRepo.findOne({ where: { userId } });
    if (!companion) {
      throw new HttpException('Companion profile not found', HttpStatus.NOT_FOUND);
    }
    await this.companionRepo.remove(companion);
    return { status: 'success', message: 'Companion profile reset/deleted successfully' };
  }
}