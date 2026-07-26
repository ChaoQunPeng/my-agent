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
      novelId: 'novel_1',
      name: '林默',
      alias: [],
      gender: '男',
      age: 28,
      description: '',
      appearance: [],
      personality: [],
      background: '',
      motivation: [],
      relations: [],
      organizationRelations: [],
      remark: '',
    });

    expect(characterModel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^novel_character_/),
        novelId: 'novel_1',
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

  it('finds a novel character by exact name', async () => {
    const character = { id: 'char_001', name: '林默' };
    const exec = jest.fn().mockResolvedValue(character);
    const findOne = jest.fn().mockReturnValue({ exec });
    const service = new NovelCharacterService({ findOne } as never);

    const result = await service.findOneByName('林默');

    expect(findOne).toHaveBeenCalledWith({ name: '林默' });
    expect(result).toBe(character);
  });

  it('lists only characters that belong to the selected novel', async () => {
    const exec = jest.fn().mockResolvedValue([]);
    const sort = jest.fn().mockReturnValue({ exec });
    const find = jest.fn().mockReturnValue({ sort });
    const service = new NovelCharacterService({ find } as never);

    await service.findAll('novel_1');

    expect(find).toHaveBeenCalledWith({ novelId: 'novel_1' });
  });
});
