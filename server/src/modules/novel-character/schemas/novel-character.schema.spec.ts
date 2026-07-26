import { model } from 'mongoose';
import { NovelCharacterSchema } from './novel-character.schema';

describe('NovelCharacterSchema', () => {
  it('omits the deprecated belief field from legacy documents', () => {
    const characterModel = model(
      'NovelCharacterSerializationTest',
      NovelCharacterSchema,
    );
    // 模拟数据库中的历史人物文档，验证接口序列化不会继续返回废弃字段。
    const character = characterModel.hydrate({
      id: 'char_001',
      name: '林默',
      belief: '事实不会消失',
    });

    expect(character.toJSON()).not.toHaveProperty('belief');
  });
});
