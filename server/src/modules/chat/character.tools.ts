import { ChatCompletionTool } from 'openai/resources';

// 描述按姓名获取人物完整上下文的调用场景和严格入参。
export const getCharacterContextTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_character_context',
    description:
      '当用户明确提供具体人物姓名，并查询该人物的基础资料、人物设定、人物关系或所属组织/势力时，调用此工具；当需要创作、续写或分析涉及该人物的剧情，并需要了解完整上下文时，也应调用此工具。主角、男主、男主角、女主、女主角、配角和反派是人物定位，不是人物姓名，此类问题应使用 get_characters_by_role。',
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

// 描述按人物定位查询人物概要的调用场景和严格入参。
export const getCharactersByRoleTool: ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'get_characters_by_role',
    description:
      '当用户未指定具体人物姓名，而是询问谁是主角、主要角色、男主、男主角、女主、女主角、配角或反派时，调用此工具。男主和女主是男主角、女主角的常用简称，也必须作为人物定位处理。传入用户使用的人物定位关键词，在当前小说人物的描述和备注中搜索匹配人物。',
    strict: true,
    parameters: {
      type: 'object',
      properties: {
        keyword: {
          type: 'string',
          description:
            '用户使用的人物定位关键词，例如主角、男主、男主角、女主、女主角、配角或反派',
        },
      },
      required: ['keyword'],
      additionalProperties: false,
    },
  },
};
