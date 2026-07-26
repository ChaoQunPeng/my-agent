import { model } from 'mongoose';
import { NovelSchema } from './novel.schema';

describe('NovelSchema', () => {
  it('defaults content to an empty string for existing novels', () => {
    const novelModel = model('NovelContentDefaultTest', NovelSchema);
    // 旧小说没有 content 字段时保持返回结构稳定。
    const novel = novelModel.hydrate({ id: 'novel_001', name: '雾都纪事' });

    expect(novel.content).toBe('');
  });
});
