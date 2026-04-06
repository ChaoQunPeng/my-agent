import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { CharacterService } from './character.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { BindCharacterToSessionDto } from './dto/bind-character.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

/**
 * 人物控制器
 * 提供人物信息的RESTful API接口
 */
@Controller('characters')
export class CharacterController {
  constructor(private readonly characterService: CharacterService) {}

  /**
   * 创建新人物
   * @param createCharacterDto 创建人物的数据传输对象
   * @returns 创建成功的人物信息
   */
  @Post('create')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async create(@Body() createCharacterDto: CreateCharacterDto) {
    const character = await this.characterService.create(createCharacterDto);
    return ApiResponseDto.success(character, '人物创建成功');
  }

  /**
   * 获取所有人物列表
   * @returns 人物列表
   */
  @Post('list')
  async findAll() {
    const characters = await this.characterService.findAll();
    return ApiResponseDto.success(characters);
  }

  /**
   * 获取人物详情
   * @param params 包含人物ID的参数对象
   * @returns 人物详细信息
   */
  @Post('detail')
  async findOne(@Body() params: { id: string }) {
    const character = await this.characterService.findOne(params.id);
    return ApiResponseDto.success(character);
  }

  /**
   * 更新人物信息
   * @param params 包含人物ID和更新数据的参数对象
   * @returns 更新后的人物信息
   */
  @Post('update')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async update(@Body() params: { id: string } & UpdateCharacterDto) {
    const { id, ...data } = params;
    const character = await this.characterService.update(id, data);
    return ApiResponseDto.success(character, '人物更新成功');
  }

  /**
   * 删除人物
   * @param params 包含人物ID的参数对象
   * @returns 删除成功的响应
   */
  @Post('delete')
  async remove(@Body() params: { id: string }) {
    await this.characterService.remove(params.id);
    return ApiResponseDto.success(null, '人物删除成功');
  }

  /**
   * 将人物绑定到会话
   * @param bindDto 包含人物ID和会话ID的DTO
   * @returns 更新后的人物信息
   */
  @Post('bind-session')
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  async bindToSession(@Body() bindDto: BindCharacterToSessionDto) {
    const character = await this.characterService.bindToSession(bindDto);
    return ApiResponseDto.success(character, '人物绑定成功');
  }

  /**
   * 获取绑定到指定会话的人物
   * @param params 包含会话ID的参数对象
   * @returns 绑定的人物信息
   */
  @Post('find-by-session')
  async findBySessionId(@Body() params: { sessionId: string }) {
    const character = await this.characterService.findBySessionId(
      params.sessionId,
    );
    return ApiResponseDto.success(character);
  }
}
