// // src/personal-ai/personal-ai.module.ts
// import { Module } from '@nestjs/common';
// import { PersonalAiController } from './personal-ai.controller.js';
// import { PersonalAiService } from './personal-ai.service.js';

// @Module({
//   controllers: [PersonalAiController],
//   providers: [PersonalAiService],
//   exports: [PersonalAiService],
// })
// export class PersonalAiModule {}


// src/personal-ai/personal-ai.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalAiController } from './personal-ai.controller.js';
import { PersonalAiService } from './personal-ai.service.js';
import { AiConversation } from './entities/conversation.entity.js';
import { AiMessage } from './entities/ai-message.entity.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AiConversation, AiMessage]), // Connect entities here
  ],
  controllers: [PersonalAiController],
  providers: [PersonalAiService],
  exports: [PersonalAiService],
})
export class PersonalAiModule {}