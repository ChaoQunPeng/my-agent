import { IsArray, IsOptional, IsString, Matches } from 'class-validator';

export class CreateNovelOrganizationDto {
  @IsString()
  @IsOptional()
  id?: string;

  @IsString()
  @Matches(/\S/)
  novelId!: string;

  @IsString()
  @Matches(/\S/)
  name!: string;

  @IsArray()
  @IsString({ each: true })
  alias!: string[];

  @IsString()
  description!: string;

  @IsString()
  background!: string;

  @IsArray()
  @IsString({ each: true })
  motivation!: string[];

  @IsString()
  belief!: string;

  @IsString()
  remark!: string;
}
