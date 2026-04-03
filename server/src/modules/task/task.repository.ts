import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Task, TaskDocument } from './schemas/task.schema';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

/**
 * TaskRepository - 数据访问层
 * 只负责 DB 的 CRUD，不含任何业务逻辑
 */
@Injectable()
export class TaskRepository {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async findAll(params?: { current?: number; pageSize?: number; name?: string; status?: string; priority?: string; assignee?: string }): Promise<TaskDocument[]> {
    const query: any = {};
    
    // 构建查询条件
    if (params?.name) query.name = { $regex: params.name, $options: 'i' };
    if (params?.status) query.status = params.status;
    if (params?.priority) query.priority = params.priority;
    if (params?.assignee) query.assignee = { $regex: params.assignee, $options: 'i' };
    
    // 分页
    const skip = params?.current && params?.pageSize ? (params.current - 1) * params.pageSize : 0;
    const limit = params?.pageSize || 0;
    
    return this.taskModel.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).exec();
  }

  async findById(id: string): Promise<TaskDocument | null> {
    return this.taskModel.findById(id).exec();
  }

  async create(dto: CreateTaskDto): Promise<TaskDocument> {
    return this.taskModel.create(dto);
  }

  async update(id: string, dto: UpdateTaskDto): Promise<TaskDocument | null> {
    return this.taskModel.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  async delete(id: string): Promise<TaskDocument | null> {
    return this.taskModel.findByIdAndDelete(id).exec();
  }

  async findByStatus(status: string): Promise<TaskDocument[]> {
    return this.taskModel.find({ status }).exec();
  }

  async findByAssignee(assignee: string): Promise<TaskDocument[]> {
    return this.taskModel.find({ assignee }).exec();
  }
}
