import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

export interface Session {
  id: string;
  history: OpenAI.Chat.Completions.ChatCompletionMessageParam[];
  createdAt: Date;
  lastActiveAt: Date;
  title?: string;
}

@Injectable()
export class AppService {
  private apiKey: string;
  private baseUrl: string;
  private openai: OpenAI;
  // 固定使用一个会话，用于个人调试
  private readonly FIXED_SESSION_ID = 'debug_session_001';
  private session: Session | null = null;

  constructor(private configService: ConfigService) {
    this.apiKey = this.configService.getOrThrow<string>('DEEPSEEK_API_KEY');
    this.baseUrl = this.configService.getOrThrow<string>('DEEPSEEK_API_URL');

    this.openai = new OpenAI({
      apiKey: this.apiKey,
      baseURL: this.baseUrl,
    });
  }

  // ========== 带历史对话的方法 (单会话调试版) ==========

  /**
   * 获取或创建固定会话
   */
  private getOrCreateSession(): Session {
    if (!this.session) {
      this.session = {
        id: this.FIXED_SESSION_ID,
        history: [
          {
            role: 'system',
            content: `你是专业的小说创作助手，名叫"墨客"，拥有15年编辑和创作经验。

# 你的任务
帮助用户完善以下四个方面：

1. 【人物塑造】
   - 基本信息：姓名、年龄、外貌
   - 性格特点：核心性格 + 矛盾面
   - 背景故事：影响性格的关键经历
   - 能力特长
   - 成长弧光：从开始到结束的变化
   - 人际关系

2. 【剧情设计】
   - 核心冲突
   - 起承转合（如何开始、发展、转折、收尾）
   - 悬念设置
   - 情感要点

3. 【世界观构建】
   - 世界背景
   - 力量体系/规则
   - 社会结构
   - 矛盾冲突点

4. 【大纲规划】
   - 故事梗概（一句话）
   - 三幕结构（建置25%、对抗50%、解决25%）
   - 关键情节点（激励事件、转折点、中点、高潮）
   - 章节规划

# 输出规范
1. 使用【】标注每个部分的标题
2. 每个建议都要说明"为什么这样设计"
3. 给出具体例子，不要说空话
4. 回复长度500-2000字
5. 保持热血、成长的风格基调

# 创作原则
- 人物要有动机，行为要符合性格
- 剧情要有因果关系
- 失去魔法不是终点，而是另一种开始
- 成长要有阶梯感，不能一蹴而就

# 禁止事项
- 不要评价"好"或"差"
- 不要替用户做决定
- 不要偏离玄幻题材
- 不要让主角轻易恢复魔法

# 当前进度提醒
- 已完成：世界观、主角
- 待完善：配角、剧情、大纲

请根据用户的需求，提供专业的创作建议。`,
          },
        ],
        createdAt: new Date(),
        lastActiveAt: new Date(),
        title: '调试会话',
      };
    }
    return this.session;
  }

  /**
   * 带历史的对话（核心方法）
   * @param userMessage 用户消息
   * @returns AI 回复
   */
  async chatWithHistory(userMessage: string): Promise<string> {
    const session = this.getOrCreateSession();

    // 1. 添加用户消息到历史
    session.history.push({ role: 'user', content: userMessage });

    // 2. 调用 API（传入完整历史）
    const completion = await this.openai.chat.completions.create({
      model: 'deepseek-chat',
      messages: session.history,
      temperature: 0.8,
      max_tokens: 2000,
    });

    const reply = completion.choices[0].message.content || '';

    // 3. 保存 AI 回复到历史
    session.history.push({ role: 'assistant', content: reply });

    // 4. 更新最后活跃时间
    session.lastActiveAt = new Date();

    return reply;
  }

  /**
   * 获取历史对话（不包含 system prompt，便于前端展示）
   * @returns 历史对话数组
   */
  getHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    if (!this.session) return [];
    // 返回历史，去掉 system prompt
    return this.session.history.slice(1);
  }

  /**
   * 获取完整历史（包含 system prompt）
   * @returns 完整历史对话数组
   */
  getFullHistory(): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.session?.history || [];
  }

  /**
   * 清空会话历史
   */
  clearHistory(): void {
    this.session = null;
  }

  /**
   * 获取会话信息
   */
  getSessionInfo(): {
    id: string;
    title: string;
    createdAt: Date;
    lastActiveAt: Date;
    messageCount: number;
  } | null {
    if (!this.session) return null;
    return {
      id: this.session.id,
      title: this.session.title || '未命名会话',
      createdAt: this.session.createdAt,
      lastActiveAt: this.session.lastActiveAt,
      messageCount: this.session.history.filter(
        (msg) => msg.role === 'user' || msg.role === 'assistant',
      ).length,
    };
  }
}
