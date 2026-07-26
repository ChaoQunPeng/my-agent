import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNovelCharacterDto } from './dto/create-novel-character.dto';
import {
  NovelCharacter,
  NovelCharacterDocument,
} from './schemas/novel-character.schema';

@Injectable()
export class NovelCharacterService {
  constructor(
    @InjectModel(NovelCharacter.name)
    private readonly characterModel: Model<NovelCharacterDocument>,
  ) {}

  async create(data: CreateNovelCharacterDto): Promise<NovelCharacter> {
    // 业务 ID 由服务端统一生成，避免调用方产生重复格式。
    const id = `novel_character_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    return new this.characterModel({ ...data, id }).save();
  }

  async findAll(novelId?: string): Promise<NovelCharacter[]> {
    // 传入小说 ID 时只返回该小说下的人物。
    const query = novelId ? { novelId } : {};
    return this.characterModel.find(query).sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<NovelCharacter> {
    const character = await this.characterModel.findOne({ id }).exec();
    if (!character) {
      throw new NotFoundException(`Novel character ${id} not found`);
    }
    return character;
  }

  async update(
    id: string,
    data: Partial<CreateNovelCharacterDto>,
  ): Promise<NovelCharacter> {
    const character = await this.characterModel
      .findOneAndUpdate({ id }, { $set: data }, { new: true })
      .exec();
    if (!character) {
      throw new NotFoundException(`Novel character ${id} not found`);
    }
    return character;
  }

  async remove(id: string): Promise<void> {
    const character = await this.characterModel.findOneAndDelete({ id }).exec();
    if (!character) {
      throw new NotFoundException(`Novel character ${id} not found`);
    }
  }
}
