import { IsString, Matches } from 'class-validator';

export class NovelIdDto {
  @IsString()
  @Matches(/\S/)
  id!: string;
}
