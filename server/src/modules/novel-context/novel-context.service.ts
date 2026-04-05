import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  NovelConfig,
  NovelConfigDocument,
} from './schemas/novel-config.schema';
import {
  CreateNovelConfigDto,
  UpdateNovelConfigDto,
} from './dto/novel-config.dto';

@Injectable()
export class NovelContextService {
  constructor(
    @InjectModel(NovelConfig.name)
    private novelConfigModel: Model<NovelConfigDocument>,
  ) {}

  /**
   * 创建或更新小说配置(基于 sessionId)
   */
  async createOrUpdate(createDto: CreateNovelConfigDto): Promise<NovelConfig> {
    const existing = await this.novelConfigModel
      .findOne({ sessionId: createDto.sessionId })
      .exec();

    if (existing) {
      // 更新现有配置
      return (await this.novelConfigModel
        .findOneAndUpdate(
          { sessionId: createDto.sessionId },
          { $set: createDto },
          { new: true },
        )
        .exec())!;
    } else {
      // 创建新配置
      const createdConfig = new this.novelConfigModel(createDto);
      return createdConfig.save();
    }
  }

  /**
   * 根据 sessionId 获取小说配置
   */
  async findBySessionId(sessionId: string): Promise<NovelConfig | null> {
    const config = await this.novelConfigModel.findOne({ sessionId }).exec();
    return config;
  }

  /**
   * 更新小说配置
   */
  async update(
    sessionId: string,
    updateDto: UpdateNovelConfigDto,
  ): Promise<NovelConfig> {
    const updatedConfig = await this.novelConfigModel
      .findOneAndUpdate({ sessionId }, { $set: updateDto }, { new: true })
      .exec();

    if (!updatedConfig) {
      throw new NotFoundException(
        `Novel config for session ${sessionId} not found`,
      );
    }

    return updatedConfig;
  }

  /**
   * 删除小说配置
   */
  async remove(sessionId: string): Promise<void> {
    const result = await this.novelConfigModel
      .findOneAndDelete({ sessionId })
      .exec();

    if (!result) {
      throw new NotFoundException(
        `Novel config for session ${sessionId} not found`,
      );
    }
  }
}
