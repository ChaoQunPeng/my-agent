import { NovelOrganizationService } from './novel-organization.service';

describe('NovelOrganizationService', () => {
  it('creates a novel organization with a generated business id', async () => {
    const save = jest.fn().mockResolvedValue({
      id: 'novel_organization_generated',
      name: '守夜人议会',
    });
    const organizationModel = jest
      .fn()
      .mockImplementation((data: Record<string, unknown>) => ({
        ...data,
        save,
      }));
    const service = new NovelOrganizationService(organizationModel as never);

    const result = await service.create({
      name: '守夜人议会',
      alias: [],
      description: '',
      background: '',
      motivation: [],
      belief: '',
      remark: '',
    });

    expect(organizationModel).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.stringMatching(/^novel_organization_/),
        name: '守夜人议会',
      }),
    );
    expect(save).toHaveBeenCalledTimes(1);
    expect(result.id).toBe('novel_organization_generated');
  });

  it('throws when the requested novel organization does not exist', async () => {
    const organizationModel = {
      findOne: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      }),
    };
    const service = new NovelOrganizationService(organizationModel as never);

    await expect(service.findOne('missing')).rejects.toThrow(
      'Novel organization missing not found',
    );
  });
});
