import { IsNotEmpty, IsString } from 'class-validator';

export class ChatWithHistoryDto {
  // @IsNotEmpty({ message: 'message 不能为空' })
  @IsString()
  message: string;
}
