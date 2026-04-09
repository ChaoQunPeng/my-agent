import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * 文件读取服务
 * 用于读取指定文件夹下的所有文件，并将内容拼接在一起
 */
@Injectable()
export class FileReaderService {
  private readonly logger = new Logger(FileReaderService.name);

  /**
   * 读取文件夹下所有文件并拼接内容
   * @param folderPath - 文件夹路径
   * @param separator - 分隔符，默认为 '---分割线---'
   * @param fileExtensions - 可选的文件扩展名过滤数组，如 ['.md', '.txt']，为空则读取所有文件
   * @returns 拼接后的文件内容字符串
   */
  async readAndConcatFiles(
    folderPath: string,
    separator: string = '---分割线---',
    fileExtensions?: string[],
  ): Promise<string> {
    try {
      // 验证文件夹路径是否存在
      const exists = await this.directoryExists(folderPath);
      if (!exists) {
        throw new Error(`文件夹路径不存在: ${folderPath}`);
      }

      // 读取文件夹中的所有文件和子目录
      const entries = await fs.readdir(folderPath, { withFileTypes: true });

      // 过滤出文件（排除目录）
      const files = entries.filter((entry) => entry.isFile());

      // 如果指定了文件扩展名过滤，则进一步过滤
      const filteredFiles =
        fileExtensions && fileExtensions.length > 0
          ? files.filter((file) => {
              const ext = path.extname(file.name).toLowerCase();
              return fileExtensions.includes(ext);
            })
          : files;

      if (filteredFiles.length === 0) {
        this.logger.warn(`在文件夹 ${folderPath} 中未找到符合条件的文件`);
        return '';
      }

      this.logger.log(`找到 ${filteredFiles.length} 个文件，开始读取和拼接...`);

      // 读取每个文件的内容并拼接
      const contents: string[] = [];
      for (const file of filteredFiles) {
        const filePath = path.join(folderPath, file.name);
        try {
          // 读取文件内容，默认使用 UTF-8 编码
          const content = await fs.readFile(filePath, 'utf-8');

          // 添加文件名作为标识（可选，便于区分不同文件）
          const fileHeader = `# 文件: ${file.name}\n`;
          contents.push(`${fileHeader}${content}`);
        } catch (error) {
          this.logger.error(`读取文件失败: ${filePath}`, error);
          // 继续处理其他文件，不中断整个流程
        }
      }

      // 使用分隔符拼接所有内容
      const result = contents.join(`\n${separator}\n`);

      this.logger.log(`成功拼接 ${contents.length} 个文件的内容`);
      return result;
    } catch (error) {
      this.logger.error(`读取文件夹失败: ${folderPath}`, error);
      throw error;
    }
  }

  /**
   * 检查目录是否存在
   * @param dirPath - 目录路径
   * @returns 目录是否存在的布尔值
   */
  private async directoryExists(dirPath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * 获取文件夹下所有文件的列表（不包含内容）
   * @param folderPath - 文件夹路径
   * @param fileExtensions - 可选的文件扩展名过滤数组
   * @returns 文件名数组
   */
  async listFiles(
    folderPath: string,
    fileExtensions?: string[],
  ): Promise<string[]> {
    try {
      const exists = await this.directoryExists(folderPath);
      if (!exists) {
        throw new Error(`文件夹路径不存在: ${folderPath}`);
      }

      const entries = await fs.readdir(folderPath, { withFileTypes: true });
      const files = entries.filter((entry) => entry.isFile());

      const filteredFiles =
        fileExtensions && fileExtensions.length > 0
          ? files.filter((file) => {
              const ext = path.extname(file.name).toLowerCase();
              return fileExtensions.includes(ext);
            })
          : files;

      return filteredFiles.map((file) => file.name);
    } catch (error) {
      this.logger.error(`列出文件失败: ${folderPath}`, error);
      throw error;
    }
  }
}
