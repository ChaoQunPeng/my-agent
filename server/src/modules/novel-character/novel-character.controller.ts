import { Body, Controller, Post } from '@nestjs/common';
import { ApiResponseDto } from '../../common/dto/api-response.dto';
import { CreateNovelCharacterDto } from './dto/create-novel-character.dto';
import { ListNovelCharactersDto } from './dto/list-novel-characters.dto';
import { NovelCharacterIdDto } from './dto/novel-character-id.dto';
import { UpdateNovelCharacterDto } from './dto/update-novel-character.dto';
import { NovelCharacterService } from './novel-character.service';

@Controller('novel-characters')
export class NovelCharacterController {
  constructor(private readonly novelCharacterService: NovelCharacterService) {}

  @Post('get-novel-characters')
  async findAll(@Body() data?: ListNovelCharactersDto) {
    const characters = await this.novelCharacterService.findAll(data?.novelId);
    return ApiResponseDto.success(characters);
  }

  @Post('get-novel-character')
  async findOne(@Body() data: NovelCharacterIdDto) {
    const character = await this.novelCharacterService.findOne(data.id);
    return ApiResponseDto.success(character);
  }

  @Post('create-novel-character')
  async create(@Body() data: CreateNovelCharacterDto) {
    const character = await this.novelCharacterService.create(data);
    return ApiResponseDto.success(character, '小说人物创建成功');
  }

  @Post('update-novel-character')
  async update(@Body() data: UpdateNovelCharacterDto) {
    const { id, ...updateData } = data;
    const character = await this.novelCharacterService.update(id, updateData);
    return ApiResponseDto.success(character, '小说人物更新成功');
  }

  @Post('delete-novel-character')
  async remove(@Body() data: NovelCharacterIdDto) {
    await this.novelCharacterService.remove(data.id);
    return ApiResponseDto.success(null, '小说人物删除成功');
  }
}
