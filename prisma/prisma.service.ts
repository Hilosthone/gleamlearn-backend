// // src/prisma/prisma.service.ts
// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { PrismaClient } from '@prisma/client';

// @Injectable()
// export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
//   async onModuleInit() {
//     await this.$connect();
//   }

//   async onModuleDestroy() {
//     await this.$disconnect();
//   }
// }


// // prisma/prisma.service.ts
// import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
// import { createClient } from '@prisma/orm-postgres';

// @Injectable()
// export class PrismaService extends createClient() implements OnModuleInit, OnModuleDestroy {
//   async onModuleInit() {
//     // Prisma v8 manages connection states automatically or via initialization pipelines.
//   }

//   async onModuleDestroy() {
//     // Cleanup hooks if needed.
//   }
// }


// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import postgres from '@prisma/orm-postgres/runtime';
import contractJson from './schema.json' with { type: 'json' };

// Initialize the database client using the emitted local contract and connection string
const dbClient = postgres({
  contractJson,
  url: process.env.DATABASE_URL!,
});

@Injectable()
export class PrismaService extends (Object.getPrototypeOf(dbClient).constructor) implements OnModuleInit, OnModuleDestroy {
  // Bind model accessors dynamically or use the exported client instance directly
  constructor() {
    super();
    Object.assign(this, dbClient);
  }

  async onModuleInit() {
    // Prisma v8 connection initialization handled on demand
  }

  async onModuleDestroy() {
    // Cleanup if needed
  }
}