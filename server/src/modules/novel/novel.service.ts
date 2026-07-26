import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNovelDto } from './dto/create-novel.dto';
import { UpdateNovelDto } from './dto/update-novel.dto';
import { Novel, NovelDocument } from './schemas/novel.schema';

@Injectable()
export class NovelService {
  constructor(
    @InjectModel(Novel.name)
    private readonly novelModel: Model<NovelDocument>,
  ) {}

  async create(data: CreateNovelDto): Promise<Novel> {
    // 业务 ID 由服务端统一生成，避免调用方产生重复格式。
    const id = `novel_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    return new this.novelModel({ ...data, id }).save();
  }

  async findAll(): Promise<Novel[]> {
    return this.novelModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<Novel> {
    const novel = await this.novelModel.findOne({ id }).exec();
    if (!novel) {
      throw new NotFoundException(`Novel ${id} not found`);
    }
    return novel;
  }

  async update(
    id: string,
    data: Pick<UpdateNovelDto, 'name' | 'content'>,
  ): Promise<Novel> {
    const novel = await this.novelModel
      .findOneAndUpdate({ id }, { $set: data }, { new: true })
      .exec();
    if (!novel) {
      throw new NotFoundException(`Novel ${id} not found`);
    }
    return novel;
  }

  async remove(id: string): Promise<void> {
    const novel = await this.novelModel.findOneAndDelete({ id }).exec();
    if (!novel) {
      throw new NotFoundException(`Novel ${id} not found`);
    }
  }
}
