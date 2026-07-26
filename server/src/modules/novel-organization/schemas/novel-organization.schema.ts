import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelOrganizationDocument = NovelOrganization & Document;

@Schema({
  timestamps: true,
  collection: 'novel_organization',
  id: false, // 关闭 Mongoose 默认虚拟 id，使用业务 id 字段。
})
export class NovelOrganization {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  alias!: string[];

  @Prop({ trim: true })
  description!: string;

  @Prop({ trim: true })
  background!: string;

  @Prop({ type: [String], default: [] })
  motivation!: string[];

  @Prop({ trim: true })
  belief!: string;

  @Prop({ trim: true })
  remark!: string;
}

export const NovelOrganizationSchema =
  SchemaFactory.createForClass(NovelOrganization);
