import { IsString, Matches } from 'class-validator';

export class CreateNovelDto {
  @IsString()
  @Matches(/\S/)
  name!: string;
}
