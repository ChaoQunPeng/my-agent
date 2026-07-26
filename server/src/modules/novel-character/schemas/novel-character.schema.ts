import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NovelCharacterDocument = NovelCharacter & Document;

@Schema({ _id: false })
export class CharacterRelation {
  @Prop({ required: true, trim: true })
  targetId!: string;

  @Prop({ required: true, trim: true })
  relation!: string;

  @Prop({ trim: true })
  description!: string;
}

const CharacterRelationSchema = SchemaFactory.createForClass(CharacterRelation);

@Schema({ _id: false })
export class CharacterOrganizationRelation {
  @Prop({ required: true, trim: true })
  targetId!: string;

  @Prop({ required: true, trim: true })
  relation!: string;

  @Prop({ trim: true })
  description!: string;
}

const CharacterOrganizationRelationSchema = SchemaFactory.createForClass(
  CharacterOrganizationRelation,
);

@Schema({
  timestamps: true,
  collection: 'novel_characters',
  id: false, // 关闭 Mongoose 默认虚拟 id，使用业务 id 字段。
})
export class NovelCharacter {
  @Prop({ required: true, unique: true, index: true })
  id!: string;

  @Prop({ required: true, index: true })
  novelId!: string;

  @Prop({ required: true, trim: true, index: true })
  name!: string;

  @Prop({ type: [String], default: [] })
  alias!: string[];

  @Prop({ required: true, trim: true })
  gender!: string;

  @Prop({ required: true, min: 0 })
  age!: number;

  @Prop({ trim: true })
  description!: string;

  @Prop({ type: [String], default: [] })
  appearance!: string[];

  @Prop({ type: [String], default: [] })
  personality!: string[];

  @Prop({ trim: true })
  background!: string;

  @Prop({ type: [String], default: [] })
  motivation!: string[];

  @Prop({ type: [CharacterRelationSchema], default: [] })
  relations!: CharacterRelation[];

  @Prop({ type: [CharacterOrganizationRelationSchema], default: [] })
  organizationRelations!: CharacterOrganizationRelation[];

  @Prop({ trim: true })
  remark!: string;
}

export const NovelCharacterSchema =
  SchemaFactory.createForClass(NovelCharacter);

NovelCharacterSchema.set('toJSON', {
  transform: (_document, result) => {
    // 过滤历史文档中的废弃字段，避免人物接口继续返回该数据。
    Reflect.deleteProperty(result, 'belief');
    return result;
  },
});
