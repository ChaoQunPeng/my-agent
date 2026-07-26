import { IsString } from 'class-validator';

export class NovelCharacterIdDto {
  @IsString()
  id!: string;
}
