// import { definePrismaConfig } from "prisma/config";

// export default definePrismaConfig({
//   skills: {
//     agents: ["claude", "cursor", "agents", "devin"],
//   },
// });


// import 'dotenv/config'
// import { defineConfig, env } from 'prisma/config'

// export default defineConfig({
//   schema: 'prisma/schema.prisma',
//   datasource: {
//     url: env('DATABASE_URL'),
//   },
// })


// import "dotenv/config";
// import { definePrismaConfig } from "@prisma/config";
// import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

// export default definePrismaConfig({
//   orm: ormConfig({
//     contract: "./prisma/schema.prisma",
//     db: {
//       connection: process.env.DATABASE_URL!,
//     },
//   }),
// });



// import "dotenv/config";
// import { defineConfig } from "@prisma/config";
// import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

// export default defineConfig({
//   orm: ormConfig({
//     contract: "./prisma/schema.prisma",
//     db: {
//       connection: process.env.DATABASE_URL!,
//     },
//   }),
// });


// prisma.config.ts
import "dotenv/config";
import { definePrismaConfig } from "prisma/config";
import { defineConfig as ormConfig } from "@prisma/orm-postgres/config";

export default definePrismaConfig({
  orm: ormConfig({
    contract: "./prisma/schema.prisma",
    db: {
      connection: process.env.DATABASE_URL!,
    },
  }),
});