import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CreateNovelDto } from './dto/create-novel.dto';
import { NovelIdDto } from './dto/novel-id.dto';
import { UpdateNovelDto } from './dto/update-novel.dto';
import { NovelService } from './novel.service';

@Controller('novels')
export class NovelController {
  constructor(private readonly novelService: NovelService) {}

  @Post('get-novels')
  async findAll() {
    const novels = await this.novelService.findAll();
    return ApiResponseDto.success(novels);
  }

  @Post('get-novel')
  async findOne(@Body() data: NovelIdDto) {
    const novel = await this.novelService.findOne(data.id);
    return ApiResponseDto.success(novel);
  }

  @Post('create-novel')
  async create(@Body() data: CreateNovelDto) {
    const novel = await this.novelService.create(data);
    return ApiResponseDto.success(novel, '小说创建成功');
  }

  @Post('update-novel')
  async update(@Body() data: UpdateNovelDto) {
    const { id, ...updateData } = data;
    const novel = await this.novelService.update(id, updateData);
    return ApiResponseDto.success(novel, '小说更新成功');
  }

  @Post('delete-novel')
  async remove(@Body() data: NovelIdDto) {
    await this.novelService.remove(data.id);
    return ApiResponseDto.success(null, '小说删除成功');
  }
}
