import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 拆分参数
 */
export interface SplitOptions {
  chunkSize: number; // 每块目标字数
  overlap: number; // 相邻块重叠字数
}

/**
 * 单个切片被写出之后的回调，便于 service 层更新 Job 进度
 */
export type ChunkWrittenCallback = (info: {
  index: number; // 从 1 开始的切片索引
  fileName: string; // 如 chunk-0001.txt
  filePath: string; // 绝对路径
  charCount: number; // 本切片字数
}) => Promise<void> | void;

/**
 * txt 拆分服务
 * 特性：
 * 1. 以"字数"为主切分单位（使用 Array.from 正确处理中文 / emoji 等多字节字符）
 * 2. 在目标字数附近寻找句末边界（。！？…\n 等），避免在句子中间或名字中间硬切
 * 3. 相邻切片之间保留 overlap 字数的重叠，帮助大模型衔接上下文
 */
@Injectable()
export class SplitterService {
  private readonly logger = new Logger(SplitterService.name);

  // 优先作为切点的句末/段末字符集合（按"强→弱"排序）
  private readonly sentenceEndChars = ['\n\n', '\n', '。', '！', '？', '…', '!', '?', '.'];

  /**
   * 根据字数估算切片总数（仅用于初始化进度显示，实际写出个数以循环结果为准）
   */
  estimateChunkCount(totalChars: number, options: SplitOptions): number {
    const { chunkSize, overlap } = options;
    const step = Math.max(1, chunkSize - overlap);
    if (totalChars <= chunkSize) return totalChars > 0 ? 1 : 0;
    return Math.ceil((totalChars - overlap) / step);
  }

  /**
   * 执行拆分并写出文件
   * @param sourceText 原文字符串
   * @param outDir 输出目录（必须已创建）
   * @param options 拆分参数
   * @param onChunkWritten 每写出一个切片后的回调
   * @returns 实际写出的切片数
   */
  async splitAndWrite(
    sourceText: string,
    outDir: string,
    options: SplitOptions,
    onChunkWritten?: ChunkWrittenCallback,
  ): Promise<number> {
    const { chunkSize, overlap } = options;
    // 用 Array.from 按"用户可见字符"切分，避免代理对被拆成两半
    const chars = Array.from(sourceText);
    const total = chars.length;

    if (total === 0) {
      this.logger.warn('原文为空，不产生切片');
      return 0;
    }

    let start = 0;
    let index = 0;

    while (start < total) {
      // 初步目标结束位置
      let end = Math.min(start + chunkSize, total);

      // 不是最后一段时，向后(或向前)寻找一个更合适的句末边界
      if (end < total) {
        end = this.findSentenceBoundary(chars, start, end, chunkSize);
      }

      const piece = chars.slice(start, end).join('');
      index += 1;
      const fileName = `chunk-${String(index).padStart(4, '0')}.txt`;
      const filePath = path.join(outDir, fileName);

      // 使用 wx 标志避免覆盖：断点续跑时可直接跳过已存在切片（这里目前是一次性写入，不存在冲突）
      await fs.writeFile(filePath, piece, 'utf-8');

      if (onChunkWritten) {
        await onChunkWritten({
          index,
          fileName,
          filePath,
          charCount: piece.length,
        });
      }

      if (end >= total) break;
      // 下一段起点回退 overlap 实现重叠
      start = Math.max(end - overlap, start + 1);
    }

    return index;
  }

  /**
   * 在 [initialEnd - search, initialEnd + search] 范围内寻找最近的句末/段末字符
   * 策略：先向后找（保证一定达到 chunkSize），再向前找（保底不超太多）
   */
  private findSentenceBoundary(
    chars: string[],
    start: number,
    initialEnd: number,
    chunkSize: number,
  ): number {
    const total = chars.length;
    // 搜索半径：不超过 chunkSize 的 20%，且至少 100 字
    const radius = Math.max(100, Math.floor(chunkSize * 0.2));

    // 向后找：initialEnd → initialEnd + radius
    const forwardLimit = Math.min(total, initialEnd + radius);
    for (let i = initialEnd; i < forwardLimit; i++) {
      if (this.isSentenceEnd(chars, i)) {
        return i + 1; // 切点落在标点之后
      }
    }

    // 向前找：initialEnd → start + (chunkSize - radius)
    const backwardLimit = Math.max(start + Math.floor(chunkSize / 2), start + 1);
    for (let i = initialEnd - 1; i >= backwardLimit; i--) {
      if (this.isSentenceEnd(chars, i)) {
        return i + 1;
      }
    }

    // 找不到任何句末，直接用原切点（硬切）
    return initialEnd;
  }

  /**
   * 判断 chars[i] 是否是句末字符（注意 '\n\n' 是两字符需要特殊处理）
   */
  private isSentenceEnd(chars: string[], i: number): boolean {
    const c = chars[i];
    if (c === '\n' && chars[i + 1] === '\n') return true;
    return this.sentenceEndChars.includes(c);
  }
}
