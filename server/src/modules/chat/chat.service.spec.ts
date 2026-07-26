import { ChatService } from './chat.service';

describe('ChatService', () => {
  it('returns enriched character context to the model after a tool call', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(
        asAsyncStream([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_character_context',
                      type: 'function',
                      function: {
                        name: 'get_character_context',
                        arguments: '{"name":',
                      },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      function: { arguments: '"林默"}' },
                    },
                  ],
                },
              },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(
        asAsyncStream([
          {
            choices: [{ delta: { content: '人物上下文已获取' } }],
          },
        ]),
      );
    const sessionService = {
      getMessageHistory: jest.fn().mockResolvedValue([]),
      addMessage: jest.fn().mockResolvedValue(undefined),
    };
    const novelCharacterService = {
      findOneByName: jest.fn().mockResolvedValue({
        // 模拟历史人物数据，确保废弃字段不再进入聊天上下文。
        id: 'char_001',
        name: '林默',
        alias: ['阿默'],
        gender: '男',
        age: 28,
        description: '调查员',
        appearance: ['黑发'],
        personality: ['冷静'],
        background: '曾经失去记忆',
        motivation: ['寻找真相'],
        belief: '事实不会消失',
        remark: '主角',
        relations: [
          {
            targetId: 'char_002',
            relation: '朋友',
            description: '共同调查案件',
          },
        ],
        organizationRelations: [
          {
            targetId: 'org_001',
            relation: '成员',
            description: '负责外勤调查',
          },
        ],
      }),
      findOne: jest.fn().mockResolvedValue({ id: 'char_002', name: '苏晴' }),
    };
    const novelOrganizationService = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'org_001', name: '守夜人议会' }),
    };
    const service = new ChatService(
      {
        model: 'test-model',
        client: { chat: { completions: { create } } },
      } as never,
      {} as never,
      sessionService as never,
      {} as never,
      novelCharacterService as never,
      novelOrganizationService as never,
    );

    const chunks: string[] = [];
    for await (const chunk of service.chatWithHistoryStream(
      '分析林默',
      'session_1',
    )) {
      chunks.push(chunk);
    }

    expect(chunks.join('')).toBe('人物上下文已获取');
    expect(create).toHaveBeenCalledTimes(2);
    expect(novelCharacterService.findOneByName).toHaveBeenCalledWith('林默');
    expect(create.mock.calls[0][0].tools).toEqual([
      expect.objectContaining({
        type: 'function',
        function: expect.objectContaining({
          name: 'get_character_context',
          parameters: {
            type: 'object',
            properties: {
              name: {
                type: 'string',
                description: '人物姓名',
              },
            },
            required: ['name'],
            additionalProperties: false,
          },
        }),
      }),
    ]);

    const finalMessages = create.mock.calls[1][0].messages as Array<{
      role: string;
      content: string;
    }>;
    const toolMessage = finalMessages.find(
      (message) => message.role === 'tool',
    );
    expect(JSON.parse(toolMessage?.content ?? '{}')).toEqual({
      id: 'char_001',
      name: '林默',
      alias: ['阿默'],
      gender: '男',
      age: 28,
      description: '调查员',
      appearance: ['黑发'],
      personality: ['冷静'],
      background: '曾经失去记忆',
      motivation: ['寻找真相'],
      remark: '主角',
      relations: [
        {
          targetId: 'char_002',
          targetName: '苏晴',
          relation: '朋友',
          description: '共同调查案件',
        },
      ],
      organizationRelations: [
        {
          targetId: 'org_001',
          organizationName: '守夜人议会',
          relation: '成员',
          description: '负责外勤调查',
        },
      ],
    });
    expect(sessionService.addMessage).toHaveBeenCalledWith(
      'session_1',
      'assistant',
      '人物上下文已获取',
    );
  });

  it('returns character lookup errors to the model as tool results', async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce(
        asAsyncStream([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'call_missing_character',
                      type: 'function',
                      function: {
                        name: 'get_character_context',
                        arguments: '{"name":"不存在的人物"}',
                      },
                    },
                  ],
                },
              },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(
        asAsyncStream([
          {
            choices: [{ delta: { content: '未找到该人物' } }],
          },
        ]),
      );
    const service = new ChatService(
      {
        model: 'test-model',
        client: { chat: { completions: { create } } },
      } as never,
      {} as never,
      {
        getMessageHistory: jest.fn().mockResolvedValue([]),
        addMessage: jest.fn().mockResolvedValue(undefined),
      } as never,
      {} as never,
      {
        findOneByName: jest
          .fn()
          .mockRejectedValue(
            new Error('Novel character 不存在的人物 not found'),
          ),
      } as never,
      {} as never,
    );

    const chunks: string[] = [];
    for await (const chunk of service.chatWithHistoryStream('分析未知人物')) {
      chunks.push(chunk);
    }

    const finalMessages = create.mock.calls[1][0].messages as Array<{
      role: string;
      content: string;
    }>;
    const toolMessage = finalMessages.find(
      (message) => message.role === 'tool',
    );
    expect(JSON.parse(toolMessage?.content ?? '{}')).toEqual({
      error: 'Novel character 不存在的人物 not found',
    });
    expect(chunks.join('')).toBe('未找到该人物');
  });
});

function asAsyncStream(chunks: unknown[]): AsyncIterable<unknown> {
  // 模拟 OpenAI SDK 返回的异步流。
  return {
    [Symbol.asyncIterator]() {
      let index = 0;
      return {
        next: () =>
          Promise.resolve(
            index < chunks.length
              ? { value: chunks[index++], done: false }
              : { value: undefined, done: true },
          ),
      };
    },
  };
}
