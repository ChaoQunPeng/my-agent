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

    const result = await service.create({ name: '雾都纪事' });

    expect(novelModel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^novel_/),
        name: '雾都纪事',
      }),
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('novel_generated');
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
