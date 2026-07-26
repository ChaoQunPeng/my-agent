import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CreateNovelOrganizationDto } from './dto/create-novel-organization.dto';
import { ListNovelOrganizationsDto } from './dto/list-novel-organizations.dto';
import { NovelOrganizationIdDto } from './dto/novel-organization-id.dto';
import { UpdateNovelOrganizationDto } from './dto/update-novel-organization.dto';
import { NovelOrganizationService } from './novel-organization.service';

@Controller('novel-organizations')
export class NovelOrganizationController {
  constructor(
    private readonly novelOrganizationService: NovelOrganizationService,
  ) {}

  @Post('get-novel-organizations')
  async findAll(@Body() data?: ListNovelOrganizationsDto) {
    const organizations = await this.novelOrganizationService.findAll(
      data?.novelId,
    );
    return ApiResponseDto.success(organizations);
  }

  @Post('get-novel-organization')
  async findOne(@Body() data: NovelOrganizationIdDto) {
    const organization = await this.novelOrganizationService.findOne(data.id);
    return ApiResponseDto.success(organization);
  }

  @Post('create-novel-organization')
  async create(@Body() data: CreateNovelOrganizationDto) {
    const organization = await this.novelOrganizationService.create(data);
    return ApiResponseDto.success(organization, '小说组织创建成功');
  }

  @Post('update-novel-organization')
  async update(@Body() data: UpdateNovelOrganizationDto) {
    const { id, ...updateData } = data;
    const organization = await this.novelOrganizationService.update(
      id,
      updateData,
    );
    return ApiResponseDto.success(organization, '小说组织更新成功');
  }

  @Post('delete-novel-organization')
  async remove(@Body() data: NovelOrganizationIdDto) {
    await this.novelOrganizationService.remove(data.id);
    return ApiResponseDto.success(null, '小说组织删除成功');
  }
}
