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

export class NovelCharacterRelationDto {
  @IsString()
  @Matches(/\S/)
  targetId!: string;

  @IsString()
  @Matches(/\S/)
  relation!: string;

  @IsString()
  description!: string;
}

export class NovelCharacterOrganizationRelationDto extends NovelCharacterRelationDto {}

export class CreateNovelCharacterDto {
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
  @Matches(/\S/)
  gender!: string;

  @IsInt()
  @Min(0)
  age!: number;

  @IsString()
  description!: string;

  @IsArray()
  @IsString({ each: true })
  appearance!: string[];

  @IsArray()
  @IsString({ each: true })
  personality!: string[];

  @IsString()
  background!: string;

  @IsArray()
  @IsString({ each: true })
  motivation!: string[];

  @IsString()
  belief!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NovelCharacterRelationDto)
  relations!: NovelCharacterRelationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NovelCharacterOrganizationRelationDto)
  organizationRelations!: NovelCharacterOrganizationRelationDto[];

  @IsString()
  remark!: string;
}
