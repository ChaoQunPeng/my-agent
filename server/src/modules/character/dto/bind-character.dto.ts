import { IsString } from 'class-validator';

/**
 * 绑定人物到会话的DTO
 * 包含人物ID和会话ID的验证规则
 */
export class BindCharacterToSessionDto {
  // 人物ID（必填）
  @IsString()
  characterId: string;

  // 会话ID（必填）
  @IsString()
  sessionId: string;
}
