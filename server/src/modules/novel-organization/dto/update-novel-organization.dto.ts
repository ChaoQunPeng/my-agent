import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateNovelOrganizationDto {
  @IsString()
  id!: string;

  @IsString()
  @Matches(/\S/)
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  alias?: string[];

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  background?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  motivation?: string[];

  @IsString()
  @IsOptional()
  belief?: string;

  @IsString()
  @IsOptional()
  remark?: string;
}
