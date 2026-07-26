import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  NovelCharacterOrganizationRelationDto,
  NovelCharacterRelationDto,
} from './create-novel-character.dto';

export class UpdateNovelCharacterDto {
  @IsString()
  id!: string;

  @IsString()
  @Matches(/\S/)
  @IsOptional()
  novelId?: string;

  @IsString()
  @Matches(/\S/)
  @IsOptional()
  name?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  alias?: string[];

  @IsString()
  @Matches(/\S/)
  @IsOptional()
  gender?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  age?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  appearance?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  personality?: string[];

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

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NovelCharacterRelationDto)
  @IsOptional()
  relations?: NovelCharacterRelationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NovelCharacterOrganizationRelationDto)
  @IsOptional()
  organizationRelations?: NovelCharacterOrganizationRelationDto[];

  @IsString()
  @IsOptional()
  remark?: string;
}
