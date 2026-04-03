import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { UserRepository } from './user.repository';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

/**
 * UserService — 业务逻辑层
 * 只调用 Repository，不直接操作数据库
 */
@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  findAll() {
    return this.userRepository.findAll();
  }

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException(`用户 ${id} 不存在`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.userRepository.findByEmail(dto.email);
    if (exists) throw new ConflictException('该邮箱已被注册');
    return this.userRepository.create(dto);
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findById(id); // 确保用户存在
    return this.userRepository.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id); // 确保用户存在
    return this.userRepository.delete(id);
  }
}

