import { NovelService } from './novel.service';

describe('NovelService', () => {
  it('creates a novel with a generated business id', async () => {
    const save = jest.fn().mockResolvedValue({
      id: 'novel_generated',
      name: '雾都纪事',
    });
    const novelModel = jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        save,
      }));
    const service = new NovelService(novelModel as never);

    const result = await service.create({
      name: '雾都纪事',
      content: '一座终年被雾笼罩的城市。',
    });

    expect(novelModel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^novel_/),
        name: '雾都纪事',
        content: '一座终年被雾笼罩的城市。',
      }),
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('novel_generated');
  });

  it('updates a novel name and content', async () => {
    const updatedNovel = {
      id: 'novel_001',
      name: '新名称',
      content: '新的小说内容',
    };
    const findOneAndUpdate = jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedNovel),
    });
    const service = new NovelService({ findOneAndUpdate } as never);

    const result = await service.update('novel_001', {
      name: '新名称',
      content: '新的小说内容',
    });

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'novel_001' },
      { $set: { name: '新名称', content: '新的小说内容' } },
      { new: true },
    );
    expect(result).toEqual(updatedNovel);
  });

  it('throws when the requested novel does not exist', async () => {
    const novelModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };
    const service = new NovelService(novelModel as never);

    await expect(service.findOne('missing')).rejects.toThrow(
      'Novel missing not found',
    );
  });
});
