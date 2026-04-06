import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Character, CharacterDocument } from './schemas/character.schema';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto } from './dto/update-character.dto';
import { BindCharacterToSessionDto } from './dto/bind-character.dto';
// 导入Session模型用于更新会话的characterId
import { Session, SessionDocument } from '../session/schemas/session.schema';

/**
 * 人物服务类
 * 提供人物的CRUD操作以及与会话的绑定功能
 * 注意：会话与人物的关系存储在Session中（session.characterId），而不是Character中
 */
@Injectable()
export class CharacterService {
  constructor(
    // 注入人物模型
    @InjectModel(Character.name)
    private characterModel: Model<CharacterDocument>,
    // 注入会话模型用于更新会话的characterId
    @InjectModel(Session.name)
    private sessionModel: Model<SessionDocument>,
  ) {}

  /**
   * 创建新人物
   * @param createCharacterDto 创建人物的数据传输对象
   * @returns 创建成功的人物信息
   */
  async create(createCharacterDto: CreateCharacterDto): Promise<Character> {
    // 生成唯一的人物ID
    const characterId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // 创建新的人物记录
    const createdCharacter = new this.characterModel({
      characterId,
      ...createCharacterDto,
    });

    return createdCharacter.save();
  }

  /**
   * 获取所有人物列表（按创建时间倒序）
   * @returns 人物列表
   */
  async findAll(): Promise<Character[]> {
    return this.characterModel.find().sort({ createdAt: -1 }).exec();
  }

  /**
   * 根据ID获取人物详情
   * @param characterId 人物ID
   * @returns 人物详细信息
   */
  async findOne(characterId: string): Promise<Character> {
    const character = await this.characterModel.findOne({ characterId }).exec();

    if (!character) {
      throw new NotFoundException(`Character ${characterId} not found`);
    }

    return character;
  }

  /**
   * 更新人物信息
   * @param characterId 人物ID
   * @param updateCharacterDto 更新人物的数据传输对象
   * @returns 更新后的人物信息
   */
  async update(
    characterId: string,
    updateCharacterDto: UpdateCharacterDto,
  ): Promise<Character> {
    const updatedCharacter = await this.characterModel
      .findOneAndUpdate(
        { characterId },
        { $set: updateCharacterDto },
        { new: true }, // 返回更新后的文档
      )
      .exec();

    if (!updatedCharacter) {
      throw new NotFoundException(`Character ${characterId} not found`);
    }

    return updatedCharacter;
  }

  /**
   * 删除人物
   * @param characterId 人物ID
   */
  async remove(characterId: string): Promise<void> {
    const character = await this.characterModel
      .findOneAndDelete({ characterId })
      .exec();

    if (!character) {
      throw new NotFoundException(`Character ${characterId} not found`);
    }
  }

  /**
   * 将人物绑定到会话
   * 通过在Session中设置characterId来实现绑定
   * @param bindDto 包含人物ID和会话ID的DTO
   * @returns 绑定的人物信息
   */
  async bindToSession(bindDto: BindCharacterToSessionDto): Promise<Character> {
    const { characterId, sessionId } = bindDto;

    // 验证人物是否存在
    const character = await this.characterModel.findOne({ characterId }).exec();
    if (!character) {
      throw new NotFoundException(`Character ${characterId} not found`);
    }

    // 验证会话是否存在
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 检查该会话是否已经绑定了人物
    if (session.characterId) {
      throw new NotFoundException(
        `Session ${sessionId} already bound to character ${session.characterId}`,
      );
    }

    // 在Session中设置characterId
    await this.sessionModel
      .findOneAndUpdate({ sessionId }, { $set: { characterId } }, { new: true })
      .exec();

    return character;
  }

  /**
   * 获取绑定到指定会话的人物
   * 通过查询Session获取characterId，然后查询对应的人物
   * @param sessionId 会话ID
   * @returns 绑定的人物信息，如果没有则返回null
   */
  async findBySessionId(sessionId: string): Promise<Character | null> {
    // 先查询会话获取characterId
    const session = await this.sessionModel.findOne({ sessionId }).exec();

    if (!session || !session.characterId) {
      return null;
    }

    // 再查询对应的人物
    const character = await this.characterModel
      .findOne({ characterId: session.characterId })
      .exec();

    return character;
  }

  /**
   * 从会话中解绑人物
   * 通过将Session中的characterId设置为空字符串来实现解绑
   * @param characterId 人物ID
   * @param sessionId 会话ID
   * @returns 解绑的人物信息
   */
  async unbindFromSession(
    characterId: string,
    sessionId: string,
  ): Promise<Character> {
    // 验证人物是否存在
    const character = await this.characterModel.findOne({ characterId }).exec();
    if (!character) {
      throw new NotFoundException(`Character ${characterId} not found`);
    }

    // 验证会话是否存在
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new NotFoundException(`Session ${sessionId} not found`);
    }

    // 检查会话是否绑定了该人物
    if (session.characterId !== characterId) {
      throw new NotFoundException(
        `Session ${sessionId} is not bound to character ${characterId}`,
      );
    }

    // 清除Session中的characterId
    await this.sessionModel
      .findOneAndUpdate(
        { sessionId },
        { $set: { characterId: '' } },
        { new: true },
      )
      .exec();

    return character;
  }
}
