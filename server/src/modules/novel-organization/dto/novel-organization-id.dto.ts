import { IsString } from 'class-validator';

export class NovelOrganizationIdDto {
  @IsString()
  id!: string;
}
