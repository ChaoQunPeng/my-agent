import { IsString, Matches } from 'class-validator';

export class UpdateNovelDto {
  @IsString()
  @Matches(/\S/)
  id!: string;

  @IsString()
  @Matches(/\S/)
  name!: string;
}
