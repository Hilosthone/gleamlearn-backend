// // src/calendar/calendar.service.ts
// import { Injectable, NotFoundException } from '@nestjs/common';
// import { PrismaService } from '../../prisma/prisma.service.js';
// import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto.js';

// @Injectable()
// export class CalendarService {
//   constructor(private readonly prisma: PrismaService) {}

//   async getAllEvents(userId: string) {
//     return this.prisma.calendarEvent.findMany({
//       where: { userId },
//       orderBy: { startTime: 'asc' },
//     });
//   }

//   async getMonthEvents(userId: string, year: number, month: number) {
//     // Construct start and end boundaries for the requested month (e.g., Sept 1 to Sept 30)
//     const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
//     const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // 1st day of next month

//     return this.prisma.calendarEvent.findMany({
//       where: {
//         userId,
//         startTime: {
//           gte: startDate,
//           lt: endDate,
//         },
//       },
//       orderBy: { startTime: 'asc' },
//     });
//   }

//   async getWeekEvents(userId: string, startDateStr: string) {
//     const start = new Date(startDateStr);
//     const end = new Date(start);
//     end.setDate(end.getDate() + 7); // 7-day window

//     return this.prisma.calendarEvent.findMany({
//       where: {
//         userId,
//         startTime: {
//           gte: start,
//           lt: end,
//         },
//       },
//       orderBy: { startTime: 'asc' },
//     });
//   }

//   async getDayEvents(userId: string, dateStr: string) {
//     const start = new Date(`${dateStr}T00:00:00.000Z`);
//     const end = new Date(`${dateStr}T23:59:59.999Z`);

//     return this.prisma.calendarEvent.findMany({
//       where: {
//         userId,
//         startTime: {
//           gte: start,
//           lte: end,
//         },
//       },
//       orderBy: { startTime: 'asc' },
//     });
//   }

//   async createEvent(userId: string, dto: CreateCalendarEventDto) {
//     return this.prisma.calendarEvent.create({
//       data: {
//         userId,
//         title: dto.title,
//         description: dto.description,
//         startTime: new Date(dto.startTime),
//         endTime: new Date(dto.endTime),
//         isAllDay: dto.isAllDay ?? false,
//       },
//     });
//   }

//   async updateEvent(userId: string, id: string, dto: UpdateCalendarEventDto) {
//     // Verify the event belongs to the user before updating
//     const existing = await this.prisma.calendarEvent.findFirst({
//       where: { id, userId },
//     });

//     if (!existing) {
//       throw new NotFoundException(`Calendar event with ID ${id} not found.`);
//     }

//     return this.prisma.calendarEvent.update({
//       where: { id },
//       data: {
//         ...(dto.title && { title: dto.title }),
//         ...(dto.description !== undefined && { description: dto.description }),
//         ...(dto.startTime && { startTime: new Date(dto.startTime) }),
//         ...(dto.endTime && { endTime: new Date(dto.endTime) }),
//         ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
//       },
//     });
//   }

//   async deleteEvent(userId: string, id: string) {
//     // Verify ownership before deleting
//     const existing = await this.prisma.calendarEvent.findFirst({
//       where: { id, userId },
//     });

//     if (!existing) {
//       throw new NotFoundException(`Calendar event with ID ${id} not found.`);
//     }

//     await this.prisma.calendarEvent.delete({
//       where: { id },
//     });

//     return { message: 'Calendar event deleted successfully', id };
//   }
// }


// src/calendar/calendar.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { withTable } from '../common/errors/missing-table.js';
import { CalendarEvent } from './calendar-event.entity.js';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto.js';

const FEATURE = 'Calendar';

/**
 * The learner's own calendar events (TypeORM; table from database/migrations/20261028230000_calendar_events.sql).
 * Until that table exists every route answers 501 FEATURE_UNAVAILABLE. Previously a Prisma model without a table.
 */
@Injectable()
export class CalendarService {
  constructor(@InjectRepository(CalendarEvent) private readonly events: Repository<CalendarEvent>) {}

  private range(userId: string, from: Date, to: Date) {
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw new BadRequestException('Invalid date.');
    // inclusive bounds: `to` is the last millisecond of the range
    return withTable(FEATURE, () => this.events.find({ where: { userId, startTime: Between(from, to) }, order: { startTime: 'ASC' } }));
  }

  /** All of the learner's events, sorted by start time. */
  async getAllEvents(userId: string) {
    return withTable(FEATURE, () => this.events.find({ where: { userId }, order: { startTime: 'ASC' } }));
  }

  /** Events starting in a calendar month (UTC boundaries). */
  async getMonthEvents(userId: string, year: number, month: number) {
    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) throw new BadRequestException('Give a valid year and month (1–12).');
    return this.range(userId, new Date(Date.UTC(year, month - 1, 1)), new Date(Date.UTC(year, month, 1) - 1));
  }

  /** Events starting in the 7 days from the given date. */
  async getWeekEvents(userId: string, startDateStr: string) {
    const start = new Date(startDateStr);
    return this.range(userId, start, new Date(start.getTime() + 7 * 86_400_000 - 1));
  }

  /** Events starting on a calendar day (UTC). */
  async getDayEvents(userId: string, dateStr: string) {
    return this.range(userId, new Date(`${dateStr}T00:00:00.000Z`), new Date(`${dateStr}T23:59:59.999Z`));
  }

  private checkRange(start: Date, end: Date) {
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new BadRequestException('startTime and endTime must be dates.');
    if (end < start) throw new BadRequestException('The event cannot end before it starts.');
  }

  async createEvent(userId: string, dto: CreateCalendarEventDto) {
    const startTime = new Date(dto.startTime);
    const endTime = new Date(dto.endTime);
    this.checkRange(startTime, endTime);
    return withTable(FEATURE, () =>
      this.events.save(this.events.create({ userId, title: dto.title.trim().slice(0, 200), description: dto.description?.trim() || null, startTime, endTime, isAllDay: dto.isAllDay ?? false })),
    );
  }

  /** Updates one of the learner's own events (another learner's is "not found"). */
  async updateEvent(userId: string, id: string, dto: UpdateCalendarEventDto) {
    return withTable(FEATURE, async () => {
      const existing = await this.events.findOne({ where: { id, userId } });
      if (!existing) throw new NotFoundException(`Calendar event with ID ${id} not found.`);
      if (dto.title) existing.title = dto.title.trim().slice(0, 200);
      if (dto.description !== undefined) existing.description = dto.description?.trim() || null;
      if (dto.startTime) existing.startTime = new Date(dto.startTime);
      if (dto.endTime) existing.endTime = new Date(dto.endTime);
      if (dto.isAllDay !== undefined) existing.isAllDay = dto.isAllDay;
      this.checkRange(existing.startTime, existing.endTime);
      return this.events.save(existing);
    });
  }

  async deleteEvent(userId: string, id: string) {
    return withTable(FEATURE, async () => {
      const res = await this.events.delete({ id, userId });
      if (!res.affected) throw new NotFoundException(`Calendar event with ID ${id} not found.`);
      return { message: 'Calendar event deleted successfully', id };
    });
  }
}
