import { Controller, Post, Body } from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post('get-task-list')
  async getTaskList(@Body() params?: { current?: number; pageSize?: number; name?: string; status?: string; priority?: string; assignee?: string }) {
    const data = await this.taskService.findAll(params);
    return ApiResponseDto.success(data);
  }

  @Post('get-task-by-id')
  async getTaskById(@Body() params: { id: string }) {
    const data = await this.taskService.findById(params.id);
    return ApiResponseDto.success(data);
  }

  @Post('create-task')
  async createTask(@Body() dto: CreateTaskDto) {
    const data = await this.taskService.create(dto);
    return ApiResponseDto.success(data, '创建任务成功');
  }

  @Post('update-task')
  async updateTask(@Body() params: { id: string } & UpdateTaskDto) {
    const { id, ...data } = params;
    const result = await this.taskService.update(id, data);
    return ApiResponseDto.success(result, '更新任务成功');
  }

  @Post('delete-task')
  async deleteTask(@Body() params: { id: string }) {
    await this.taskService.delete(params.id);
    return ApiResponseDto.success(null, '删除任务成功');
  }

  @Post('get-tasks-by-status')
  async getTasksByStatus(@Body() params: { status: string }) {
    const data = await this.taskService.findByStatus(params.status);
    return ApiResponseDto.success(data);
  }

  @Post('get-tasks-by-assignee')
  async getTasksByAssignee(@Body() params: { assignee: string }) {
    const data = await this.taskService.findByAssignee(params.assignee);
    return ApiResponseDto.success(data);
  }
}
