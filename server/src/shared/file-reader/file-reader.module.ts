import { Module } from '@nestjs/common';
import { FileReaderService } from './file-reader.service';

/**
 * 文件读取模块
 * 提供文件读取和拼接功能的服务
 */
@Module({
  // 导出服务，供其他模块使用
  exports: [FileReaderService],
  // 提供服务实例
  providers: [FileReaderService],
})
export class FileReaderModule {}
