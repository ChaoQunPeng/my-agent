import { NovelCharacterService } from './novel-character.service';

describe('NovelCharacterService', () => {
  it('creates a novel character with a generated business id', async () => {
    const save = jest.fn().mockResolvedValue({
      id: 'novel_character_generated',
      name: '林默',
    });
    const characterModel = jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        save,
      }));
    const service = new NovelCharacterService(characterModel as never);

    const result = await service.create({
      name: '林默',
      alias: [],
      gender: '男',
      age: 28,
      description: '',
      appearance: [],
      personality: [],
      background: '',
      motivation: [],
      belief: '',
      relations: [],
      organizationRelations: [],
      remark: '',
    });

    expect(characterModel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^novel_character_/),
        name: '林默',
      }),
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('novel_character_generated');
  });

  it('throws when the requested novel character does not exist', async () => {
    const characterModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };
    const service = new NovelCharacterService(characterModel as never);

    await expect(service.findOne('missing')).rejects.toThrow(
      'Novel character missing not found',
    );
  });
});
