import { IsOptional, IsString, Matches } from 'class-validator';

export class ListNovelOrganizationsDto {
  @IsString()
  @Matches(/\S/)
  @IsOptional()
  novelId?: string;
}
