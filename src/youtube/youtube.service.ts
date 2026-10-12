// // src/youtube/youtube.service.ts
// import { Injectable, NotFoundException, InternalServerErrorException, BadRequestException } from '@nestjs/common';
// import { InjectRepository } from '@nestjs/typeorm';
// import { Repository } from 'typeorm';
// import { YoutubeEntity } from './entities/youtube.entity.js';
// import { YoutubeTranscript } from 'youtube-transcript';
// import OpenAI from 'openai';

// @Injectable()
// export class YoutubeService {
//   private openai = new OpenAI({ 
//     apiKey: process.env.OPENAI_API_KEY || process.env.OPEN_AI_KEY 
//   });

//   constructor(
//     @InjectRepository(YoutubeEntity) private youtubeRepo: Repository<YoutubeEntity>,
//   ) {}

//   private extractVideoId(url: string): string {
//     const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]*).*/;
//     const match = url.match(regExp);
//     return (match && match[2].length === 11) ? match[2] : '';
//   }

//   async createResource(userId: string, url: string): Promise<YoutubeEntity> {
//     const videoId = this.extractVideoId(url);
//     if (!videoId) {
//       throw new BadRequestException('Invalid YouTube URL format. Could not extract Video ID.');
//     }

//     const resource = this.youtubeRepo.create({
//       userId,
//       videoUrl: url,
//       videoId,
//       status: 'PENDING',
//     });

//     return this.youtubeRepo.save(resource);
//   }

//   async findAllForUser(userId: string): Promise<YoutubeEntity[]> {
//     return this.youtubeRepo.find({
//       where: { userId },
//       order: { createdAt: 'DESC' },
//     });
//   }

//   async findById(id: string): Promise<YoutubeEntity> {
//     const resource = await this.youtubeRepo.findOne({ where: { id } });
//     if (!resource) throw new NotFoundException('YouTube resource not found');
//     return resource;
//   }

//   async deleteResource(id: string): Promise<{ message: string }> {
//     const resource = await this.findById(id);
//     await this.youtubeRepo.remove(resource);
//     return { message: `YouTube resource successfully deleted` };
//   }

//   async getStatus(id: string) {
//     const resource = await this.findById(id);
//     return { id: resource.id, status: resource.status, error: resource.processingError };
//   }

//   async processYoutubeResource(id: string): Promise<YoutubeEntity> {
//     const resource = await this.findById(id);

//     resource.status = 'PROCESSING';
//     resource.processingError = '';
//     await this.youtubeRepo.save(resource);

//     try {
//       const transcriptItems = await YoutubeTranscript.fetchTranscript(resource.videoId);
//       const rawTranscript = transcriptItems.map((item: any) => item.text).join(' ');
//       resource.rawTranscript = rawTranscript;

//       if (process.env.YOUTUBE_API_KEY) {
//         const ytRes = await fetch(
//           `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${resource.videoId}&key=${process.env.YOUTUBE_API_KEY}`
//         );
//         const ytData: any = await ytRes.json();
//         if (ytData.items && ytData.items.length > 0) {
//           const snippet = ytData.items[0].snippet;
//           resource.title = snippet.title;
//           resource.description = snippet.description;
//           resource.channelTitle = snippet.channelTitle;
//           resource.thumbnailUrl = snippet.thumbnails?.high?.url || snippet.thumbnails?.default?.url;
//         }
//       } else {
//         resource.title = `YouTube Video (${resource.videoId})`;
//       }

//       const aiResponse = await this.openai.chat.completions.create({
//         model: 'gpt-4o-mini',
//         messages: [
//           {
//             role: 'system',
//             content: 'You are an expert curriculum designer. Convert the provided video transcript into structured educational study material containing: 1) Executive Summary, 2) Key Concepts (bullet points with explanations), and 3) Quiz/Review questions. Return the response as valid JSON format.',
//           },
//           {
//             role: 'user',
//             content: rawTranscript.substring(0, 15000),
//           },
//         ],
//         response_format: { type: 'json_object' },
//       });

//       resource.structuredMaterial = JSON.parse(aiResponse.choices[0].message.content || '{}');
//       resource.status = 'COMPLETED';

//       return this.youtubeRepo.save(resource);
//     } catch (error: any) {
//       resource.status = 'FAILED';
//       resource.processingError = error.message || 'Unknown processing error occurred';
//       await this.youtubeRepo.save(resource);
//       throw new InternalServerErrorException(`Failed to process YouTube video: ${resource.processingError}`);
//     }
//   }

//   async reprocessYoutubeResource(id: string): Promise<YoutubeEntity> {
//     return this.processYoutubeResource(id);
//   }
// }




import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YoutubeEntity } from './entities/youtube.entity.js';
import { YoutubeTranscript } from 'youtube-transcript';
import { getAiHttpClient } from '../common/ai-service/ai-http.client.js';
import { toAiHttpException } from '../common/ai-service/ai-error.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class YoutubeService {
  constructor(
    @InjectRepository(YoutubeEntity)
    private youtubeRepo: Repository<YoutubeEntity>,
  ) {}

  private extractVideoId(url: string): string {
    const regExp =
      /(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|&v=)([^#&?]{11})/;

    const match = url.match(regExp);

    return match && match[1] ? match[1] : '';
  }

  async createResource(
    userId: string,
    url: string,
  ): Promise<YoutubeEntity> {
    const videoId = this.extractVideoId(url);

    if (!videoId) {
      throw new BadRequestException(
        'Invalid YouTube URL format. Could not extract Video ID.',
      );
    }

    const resource = this.youtubeRepo.create({
      userId,
      videoUrl: url,
      videoId,
      status: 'PENDING',
    });

    return this.youtubeRepo.save(resource);
  }

  async findAllForUser(userId: string): Promise<YoutubeEntity[]> {
    return this.youtubeRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  // Ownership-scoped lookup: another user's resource is reported exactly like a missing one (404),
  // so resource IDs cannot be used to discover other users' data.
  async findById(id: string, userId: string): Promise<YoutubeEntity> {
    if (!userId || !UUID_PATTERN.test(id)) {
      throw new NotFoundException('YouTube resource not found');
    }

    const resource = await this.youtubeRepo.findOne({
      where: { id, userId },
    });

    if (!resource) {
      throw new NotFoundException('YouTube resource not found');
    }

    return resource;
  }

  async deleteResource(id: string, userId: string): Promise<{ message: string }> {
    const resource = await this.findById(id, userId);

    await this.youtubeRepo.remove(resource);

    return {
      message: 'YouTube resource successfully deleted',
    };
  }

  async getStatus(id: string, userId: string) {
    const resource = await this.findById(id, userId);

    return {
      id: resource.id,
      status: resource.status,
      error: resource.processingError,
    };
  }

  private async fetchTranscriptText(videoId: string): Promise<string> {
    try {
      const transcriptItems = await YoutubeTranscript.fetchTranscript(videoId);
      return transcriptItems
        .map((item: any) => item.text)
        .join(' ')
        .trim();
    } catch {
      return '';
    }
  }

  async processYoutubeResource(id: string, userId: string): Promise<YoutubeEntity> {
    const resource = await this.findById(id, userId);

    resource.status = 'PROCESSING';
    resource.processingError = '';

    await this.youtubeRepo.save(resource);

    try {
      // Fetch the transcript here first; the AI service reuses it instead of fetching again.
      // If this fetch fails or is empty, the AI service attempts its own fetch as a fallback.
      const rawTranscript = await this.fetchTranscriptText(resource.videoId);

      if (rawTranscript) {
        resource.rawTranscript = rawTranscript;
      }

      if (process.env.YOUTUBE_API_KEY) {
        const ytRes = await fetch(
          `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${resource.videoId}&key=${process.env.YOUTUBE_API_KEY}`,
        );

        const ytData: any = await ytRes.json();

        if (ytData.items && ytData.items.length > 0) {
          const snippet = ytData.items[0].snippet;

          resource.title = snippet.title;
          resource.description = snippet.description;
          resource.channelTitle = snippet.channelTitle;
          resource.thumbnailUrl =
            snippet.thumbnails?.high?.url ||
            snippet.thumbnails?.default?.url;
        }
      } else {
        resource.title = `YouTube Video (${resource.videoId})`;
      }

      const aiResponse = await getAiHttpClient().post(
        `/api/v1/youtube/${resource.id}/process`,
        {
          url: resource.videoUrl,
          ...(rawTranscript ? { transcript: rawTranscript } : {}),
        },
      );

      const generatedContent =
        aiResponse.data?.generatedContent;

      if (!generatedContent) {
        throw new HttpException(
          'AI service returned no generated learning material.',
          HttpStatus.BAD_GATEWAY,
        );
      }

      resource.structuredMaterial = generatedContent;
      resource.status = 'COMPLETED';

      return this.youtubeRepo.save(resource);
    } catch (error: any) {
      // Store and return only a safe message; upstream/provider details are logged server-side
      const safeError = toAiHttpException(error, `YouTube processing ${resource.id}`);
      const safeMessage = String(safeError.message);

      resource.status = 'FAILED';
      resource.processingError = safeMessage;

      await this.youtubeRepo.save(resource);

      throw new HttpException(
        `Failed to process YouTube video: ${safeMessage}`,
        safeError.getStatus(),
      );
    }
  }

  async reprocessYoutubeResource(
    id: string,
    userId: string,
  ): Promise<YoutubeEntity> {
    return this.processYoutubeResource(id, userId);
  }
}