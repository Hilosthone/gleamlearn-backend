// src/calendar/calendar.controller.ts
import { Controller, Get, Post, Patch, Delete, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CalendarService } from './calendar.service.js';
import { CreateCalendarEventDto, UpdateCalendarEventDto } from './dto/calendar.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@ApiTags('Calendar & Schedule')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/calendar')
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get()
  @ApiOperation({ summary: 'Get all calendar events for authenticated user' })
  @ApiResponse({ status: 200, description: 'Events retrieved successfully.' })
  getAllEvents(@CurrentUser() user: any) {
    return this.calendarService.getAllEvents(user.id);
  }

  @Get('month')
  @ApiOperation({ summary: 'Get calendar events filtered by specific month' })
  @ApiQuery({ name: 'year', required: true, example: 2026 })
  @ApiQuery({ name: 'month', required: true, example: 9 })
  getMonthEvents(@CurrentUser() user: any, @Query('year') year: number, @Query('month') month: number) {
    return this.calendarService.getMonthEvents(user.id, Number(year), Number(month));
  }

  @Get('week')
  @ApiOperation({ summary: 'Get calendar events filtered by specific week starting date' })
  @ApiQuery({ name: 'startDate', required: true, example: '2026-09-21' })
  getWeekEvents(@CurrentUser() user: any, @Query('startDate') startDate: string) {
    return this.calendarService.getWeekEvents(user.id, startDate);
  }

  @Get('day')
  @ApiOperation({ summary: 'Get calendar events for a specific date' })
  @ApiQuery({ name: 'date', required: true, example: '2026-09-25' })
  getDayEvents(@CurrentUser() user: any, @Query('date') date: string) {
    return this.calendarService.getDayEvents(user.id, date);
  }

  @Post('events')
  @ApiOperation({ summary: 'Create a new calendar schedule event' })
  @ApiResponse({ status: 201, description: 'Event created successfully.' })
  createEvent(@CurrentUser() user: any, @Body() dto: CreateCalendarEventDto) {
    return this.calendarService.createEvent(user.id, dto);
  }

  @Patch('events/:id')
  @ApiOperation({ summary: 'Update an existing calendar event' })
  @ApiResponse({ status: 200, description: 'Event updated successfully.' })
  updateEvent(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() dto: UpdateCalendarEventDto,
  ) {
    return this.calendarService.updateEvent(user.id, id, dto);
  }

  @Delete('events/:id')
  @ApiOperation({ summary: 'Delete a calendar event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully.' })
  deleteEvent(@CurrentUser() user: any, @Param('id') id: string) {
    return this.calendarService.deleteEvent(user.id, id);
  }
}