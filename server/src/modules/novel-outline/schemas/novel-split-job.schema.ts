import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelSplitJobDocument = NovelSplitJob & Document;

/**
 * 任务状态
 * - splitting: 正在拆分源文件
 * - split_done: 拆分完成，待生成大纲
 * - generating: 正在调用大模型生成大纲
 * - done: 全部完成
 * - failed: 任务失败
 * - aborted: 用户中止
 */
export type NovelSplitJobStatus =
  | 'splitting'
  | 'split_done'
  | 'generating'
  | 'done'
  | 'failed'
  | 'aborted';

/**
 * 小说拆分 + 大纲生成任务记录
 * 同时承载"拆分进度"与"大纲生成进度"两个阶段的断点信息
 */
@Schema({
  timestamps: true,
  collection: 'novel_split_jobs',
})
export class NovelSplitJob {
  // 业务侧任务ID（外部对接使用的主键，方便前端拿到后轮询）
  @Prop({ required: true, unique: true, index: true, comment: '任务ID' })
  jobId: string;

  // 关联的小说编码（和 NovelConfig.novelCode 对齐）
  @Prop({ required: true, index: true, comment: '小说唯一识别码' })
  novelCode: string;

  // 上传时的原始文件名（仅作展示）
  @Prop({ required: true, comment: '用户上传的原始 txt 文件名' })
  sourceFileName: string;

  // 原文总字数（按 Array.from(str).length 计算，兼容中文 CJK）
  @Prop({ default: 0, comment: '原文总字数' })
  totalChars: number;

  // 拆分参数：每块字数 & 相邻块重叠字数
  @Prop({ default: 5000, comment: '每个切片的字数' })
  chunkSize: number;

  @Prop({ default: 300, comment: '相邻切片之间的重叠字数' })
  overlap: number;

  // 切片产物所在目录（绝对路径）
  @Prop({ required: true, comment: '切片文件所在目录' })
  chunkDir: string;

  // 源 txt 文件的存档路径（绝对路径，万一要重新拆分）
  @Prop({ required: true, comment: '上传原文的落盘路径' })
  sourceFilePath: string;

  // 拆分阶段：预计切片数 & 已写出切片数
  @Prop({ default: 0, comment: '预计切片总数' })
  totalChunks: number;

  @Prop({ default: 0, comment: '已成功写出的切片数' })
  splittedChunks: number;

  // 生成阶段：已经送给大模型处理完成的切片数（从 0 开始递增，也是断点索引）
  @Prop({ default: 0, comment: '已被大模型处理的切片数（断点续跑游标）' })
  processedChunks: number;

  // 任务状态
  @Prop({
    required: true,
    enum: [
      'splitting',
      'split_done',
      'generating',
      'done',
      'failed',
      'aborted',
    ],
    default: 'splitting',
    index: true,
    comment: '任务状态',
  })
  status: NovelSplitJobStatus;

  // 失败原因（仅在 failed 状态下有值）
  @Prop({ default: '', comment: '最近一次失败的错误信息' })
  lastError: string;
}

export const NovelSplitJobSchema = SchemaFactory.createForClass(NovelSplitJob);
