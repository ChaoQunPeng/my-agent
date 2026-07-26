import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateNovelOrganizationDto } from './dto/create-novel-organization.dto';
import {
  NovelOrganization,
  NovelOrganizationDocument,
} from './schemas/novel-organization.schema';

@Injectable()
export class NovelOrganizationService {
  constructor(
    @InjectModel(NovelOrganization.name)
    private readonly organizationModel: Model<NovelOrganizationDocument>,
  ) {}

  async create(data: CreateNovelOrganizationDto): Promise<NovelOrganization> {
    // 业务 ID 由服务端统一生成，避免调用方产生重复格式。
    const id = `novel_organization_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
    return new this.organizationModel({ ...data, id }).save();
  }

  async findAll(): Promise<NovelOrganization[]> {
    return this.organizationModel.find().sort({ createdAt: -1 }).exec();
  }

  async findOne(id: string): Promise<NovelOrganization> {
    const organization = await this.organizationModel.findOne({ id }).exec();
    if (!organization) {
      throw new NotFoundException(`Novel organization ${id} not found`);
    }
    return organization;
  }

  async update(
    id: string,
    data: Partial<CreateNovelOrganizationDto>,
  ): Promise<NovelOrganization> {
    const organization = await this.organizationModel
      .findOneAndUpdate({ id }, { $set: data }, { new: true })
      .exec();
    if (!organization) {
      throw new NotFoundException(`Novel organization ${id} not found`);
    }
    return organization;
  }

  async remove(id: string): Promise<void> {
    const organization = await this.organizationModel
      .findOneAndDelete({ id })
      .exec();
    if (!organization) {
      throw new NotFoundException(`Novel organization ${id} not found`);
    }
  }
}
