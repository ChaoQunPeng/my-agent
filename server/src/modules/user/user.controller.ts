import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  async findAll() {
    const data = await this.userService.findAll();
    return ApiResponseDto.success(data);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const data = await this.userService.findById(id);
    return ApiResponseDto.success(data);
  }

  @Post()
  async create(@Body() dto: CreateUserDto) {
    const data = await this.userService.create(dto);
    return ApiResponseDto.success(data, '创建成功');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    const data = await this.userService.update(id, dto);
    return ApiResponseDto.success(data, '更新成功');
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.userService.delete(id);
    return ApiResponseDto.success(null, '删除成功');
  }
}

