import { ChatCompletionTool } from 'openai/resources';

// 描述人物上下文 Tool 的调用场景和严格入参。
export const getCharacterContextTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_character_context',
    description:
      '当用户查询某个人物的基础资料、人物设定、人物关系或所属组织/势力时，调用此工具；当需要创作、续写或分析涉及某个人物的剧情，并需要了解该人物的完整上下文时，也应调用此工具。传入人物姓名，获取适合大模型理解的人物完整上下文。',
    strict: true,
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
  },
};
