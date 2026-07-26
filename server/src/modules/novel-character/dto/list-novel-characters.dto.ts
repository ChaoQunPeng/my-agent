import { IsOptional, IsString, Matches } from 'class-validator';

export class ListNovelCharactersDto {
  @IsString()
  @Matches(/\S/)
  @IsOptional()
  novelId?: string;
}
