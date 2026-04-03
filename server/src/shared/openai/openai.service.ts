import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class OpenaiService {
  readonly client: OpenAI;
  readonly model: string;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.getOrThrow<string>('DEEPSEEK_API_KEY');
    const baseURL = this.configService.getOrThrow<string>('DEEPSEEK_API_URL');

    this.client = new OpenAI({ apiKey, baseURL });
    this.model = this.configService.get<string>('DEEPSEEK_MODEL', 'deepseek-chat');
  }
}

