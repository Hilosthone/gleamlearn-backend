// // src/youtube/youtube.controller.ts
// import { Controller, Get, Post, Delete, Param, Body, UseGuards } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
// import { YoutubeService } from './youtube.service.js';
// import { CreateYoutubeDto } from './dto/create-youtube.dto.js';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

// @ApiTags('YouTube Learning Material')
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard)
// @Controller('api/v1/youtube')
// export class YoutubeController {
//   constructor(private readonly youtubeService: YoutubeService) {}

//   @Post()
//   @ApiOperation({ summary: 'Submit a YouTube video URL for learning pipeline conversion' })
//   createResource(@Request() req: any, @Body() dto: CreateYoutubeDto) {
//     const userId = req.user.id || req.user.sub;
//     return this.youtubeService.createResource(userId, dto.url);
//   }

//   @Get()
//   @ApiOperation({ summary: 'Get all YouTube resources submitted by the user' })
//   findAllResources(@Request() req: any) {
//     const userId = req.user.id || req.user.sub;
//     return this.youtubeService.findAllForUser(userId);
//   }

//   @Get(':id')
//   @ApiOperation({ summary: 'Get details and structured material of a specific YouTube resource'  })
//   findResourceById(@Param('id') id: string) {
//     return this.youtubeService.findById(id);
//   }

//   @Delete(':id')
//   @ApiOperation({ summary: 'Delete a submitted YouTube resource' })
//   deleteResource(@Param('id') id: string) {
//     return this.youtubeService.deleteResource(id);
//   }

//   @Get(':id/status')
//   @ApiOperation({ summary: 'Check processing status of a YouTube resource' })
//   getResourceStatus(@Param('id') id: string) {
//     return this.youtubeService.getStatus(id);
//   }

//   @Post(':id/process')
//   @ApiOperation({ summary: 'Trigger transcription and OpenAI structuring for a YouTube video' })
//   processResource(@Param('id') id: string) {
//     return this.youtubeService.processYoutubeResource(id);
//   }

//   @Post(':id/reprocess')
//   @ApiOperation({ summary: 'Reprocess a failed or outdated YouTube resource' })
//   reprocessResource(@Param('id') id: string) {
//     return this.youtubeService.reprocessYoutubeResource(id);
//   }
// }


// src/youtube/youtube.controller.ts
import { Controller, Get, Post, Delete, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { YoutubeService } from './youtube.service.js';
import { CreateYoutubeDto } from './dto/create-youtube.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@ApiTags('YouTube Learning Material')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Post()
  @ApiOperation({ summary: 'Submit a YouTube video URL for learning pipeline conversion' })
  createResource(@Req() req: any, @Body() dto: CreateYoutubeDto) {
    const userId = req.user.id || req.user.sub;
    return this.youtubeService.createResource(userId, dto.url);
  }

  @Get()
  @ApiOperation({ summary: 'Get all YouTube resources submitted by the user' })
  findAllResources(@Req() req: any) {
    const userId = req.user.id || req.user.sub;
    return this.youtubeService.findAllForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and structured material of a specific YouTube resource' })
  findResourceById(@Param('id') id: string) {
    return this.youtubeService.findById(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a submitted YouTube resource' })
  deleteResource(@Param('id') id: string) {
    return this.youtubeService.deleteResource(id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: 'Check processing status of a YouTube resource' })
  getResourceStatus(@Param('id') id: string) {
    return this.youtubeService.getStatus(id);
  }

  @Post(':id/process')
  @ApiOperation({ summary: 'Trigger transcription and OpenAI structuring for a YouTube video' })
  processResource(@Param('id') id: string) {
    return this.youtubeService.processYoutubeResource(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocess a failed or outdated YouTube resource' })
  reprocessResource(@Param('id') id: string) {
    return this.youtubeService.reprocessYoutubeResource(id);
  }
}