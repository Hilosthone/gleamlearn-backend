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
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto.js';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetches all calendar events belonging to a specific user, sorted by start time.
   */
  async getAllEvents(userId: string) {
    return this.prisma.calendarEvent.findMany({
      where: { userId },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Fetches calendar events for a specific month using UTC date boundaries.
   */
  async getMonthEvents(userId: string, year: number, month: number) {
    // Construct start and end boundaries for the requested month (e.g., Sept 1 to Sept 30)
    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0)); // 1st day of next month

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Fetches a 7-day window of events starting from the given date string.
   */
  async getWeekEvents(userId: string, startDateStr: string) {
    const start = new Date(startDateStr);
    const end = new Date(start);
    end.setDate(end.getDate() + 7); // 7-day window

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: start,
          lt: end,
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Fetches all events falling within a specific calendar day.
   */
  async getDayEvents(userId: string, dateStr: string) {
    const start = new Date(`${dateStr}T00:00:00.000Z`);
    const end = new Date(`${dateStr}T23:59:59.999Z`);

    return this.prisma.calendarEvent.findMany({
      where: {
        userId,
        startTime: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Creates a new calendar event linked to the authorized user.
   */
  async createEvent(userId: string, dto: CreateCalendarEventDto) {
    return this.prisma.calendarEvent.create({
      data: {
        userId,
        title: dto.title,
        description: dto.description,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        isAllDay: dto.isAllDay ?? false,
      },
    });
  }

  /**
   * Updates an existing event after verifying that it belongs to the user.
   */
  async updateEvent(userId: string, id: string, dto: UpdateCalendarEventDto) {
    // Verify the event belongs to the user before updating (Multi-tenant security check)
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Calendar event with ID ${id} not found.`);
    }

    return this.prisma.calendarEvent.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startTime && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime && { endTime: new Date(dto.endTime) }),
        ...(dto.isAllDay !== undefined && { isAllDay: dto.isAllDay }),
      },
    });
  }

  /**
   * Deletes a calendar event after confirming ownership.
   */
  async deleteEvent(userId: string, id: string) {
    // Verify ownership before deleting
    const existing = await this.prisma.calendarEvent.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      throw new NotFoundException(`Calendar event with ID ${id} not found.`);
    }

    await this.prisma.calendarEvent.delete({
      where: { id },
    });

    return { message: 'Calendar event deleted successfully', id };
  }
}