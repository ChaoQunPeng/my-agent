import { IsString } from 'class-validator';

export class ChatWithHistoryDto {
  @IsString()
  message: string;
}

