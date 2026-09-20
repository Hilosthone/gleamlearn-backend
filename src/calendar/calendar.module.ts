// // src/calendar/calendar.module.ts
// import { Module } from '@nestjs/common';
// import { CalendarController } from './calendar.controller.js';
// import { CalendarService } from './calendar.service.js';
// import { PrismaModule } from '../../prisma/prisma.module.js'; 

// @Module({
//   imports: [PrismaModule], // Required to inject PrismaService into CalendarService
//   controllers: [CalendarController],
//   providers: [CalendarService],
//   exports: [CalendarService], // Export in case other modules need to interact with the calendar
// })
// export class CalendarModule {}


// // src/calendar/calendar.module.ts
// import { Module } from '@nestjs/common';
// import { CalendarController } from './calendar.controller.js';
// import { CalendarService } from './calendar.service.js';
// // Note: No PrismaModule import needed here!

// @Module({
//   imports: [], // Leave empty or include other modules if needed
//   controllers: [CalendarController],
//   providers: [CalendarService],
//   exports: [CalendarService],
// })

// export class CalendarModule {}



// src/calendar/calendar.module.ts
import { Module } from '@nestjs/common';
import { CalendarController } from './calendar.controller.js';
import { CalendarService } from './calendar.service.js';
import { PrismaService } from '../prisma/prisma.service.js'; 

@Module({
  imports: [],
  controllers: [CalendarController],
  providers: [CalendarService, PrismaService], 
  exports: [CalendarService],
})
export class CalendarModule {}