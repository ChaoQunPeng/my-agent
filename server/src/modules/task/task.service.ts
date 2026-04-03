import { Injectable, NotFoundException } from '@nestjs/common';
import { TaskRepository } from './task.repository';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

/**
 * TaskService - 业务逻辑层
 * 只调用 Repository，不直接操作数据库
 */
@Injectable()
export class TaskService {
  constructor(private readonly taskRepository: TaskRepository) {}

  findAll(params?: { current?: number; pageSize?: number; name?: string; status?: string; priority?: string; assignee?: string }) {
    return this.taskRepository.findAll(params);
  }

  async findById(id: string) {
    const task = await this.taskRepository.findById(id);
    if (!task) throw new NotFoundException(`任务 ${id} 不存在`);
    return task;
  }

  create(dto: CreateTaskDto) {
    return this.taskRepository.create(dto);
  }

  async update(id: string, dto: UpdateTaskDto) {
    await this.findById(id); // 确保任务存在
    return this.taskRepository.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id); // 确保任务存在
    return this.taskRepository.delete(id);
  }

  findByStatus(status: string) {
    return this.taskRepository.findByStatus(status);
  }

  findByAssignee(assignee: string) {
    return this.taskRepository.findByAssignee(assignee);
  }
}
