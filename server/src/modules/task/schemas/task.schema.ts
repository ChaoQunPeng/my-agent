import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { TaskStatus, TaskPriority } from '../dto/task.dto';

export type TaskDocument = Task & Document;

@Schema({ timestamps: true })
export class Task {
  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ required: true, default: TaskStatus.PENDING })
  status: TaskStatus;

  @Prop({ required: true, default: TaskPriority.MEDIUM })
  priority: TaskPriority;

  @Prop()
  assignee: string;

  @Prop()
  dueDate: Date;

  @Prop()
  completedAt: Date;

  @Prop({ type: [String], default: [] })
  tags: string[];
}

export const TaskSchema = SchemaFactory.createForClass(Task);
