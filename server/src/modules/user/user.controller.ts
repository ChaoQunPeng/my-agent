import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('getUserList')
  async getUserList(@Body() params?: { current?: number; pageSize?: number }) {
    const data = await this.userService.findAll(params);
    return ApiResponseDto.success(data);
  }

  @Post('getUserById')
  async getUserById(@Body() params: { id: string }) {
    const data = await this.userService.findById(params.id);
    return ApiResponseDto.success(data);
  }

  @Post('createUser')
  async createUser(@Body() dto: CreateUserDto) {
    const data = await this.userService.create(dto);
    return ApiResponseDto.success(data, '创建成功');
  }

  @Post('updateUser')
  async updateUser(@Body() params: { id: string } & UpdateUserDto) {
    const { id, ...data } = params;
    const result = await this.userService.update(id, data);
    return ApiResponseDto.success(result, '更新成功');
  }

  @Post('deleteUser')
  async deleteUser(@Body() params: { id: string }) {
    await this.userService.delete(params.id);
    return ApiResponseDto.success(null, '删除成功');
  }
}
