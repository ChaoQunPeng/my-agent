# 文件读取服务 (FileReaderService)

## 功能说明

该服务用于读取指定文件夹下的所有文件（通常是 markdown 或 txt 文件），并将它们的内容拼接成一个字符串，默认使用 `---分割线---` 作为分隔符。

## 使用方法

### 1. 导入模块

在你的模块中导入 `FileReaderModule`：

```typescript
import { Module } from '@nestjs/common';
import { FileReaderModule } from '../shared/file-reader/file-reader.module';

@Module({
  imports: [FileReaderModule],
  // ... 其他配置
})
export class YourModule {}
```

### 2. 注入服务

在你的服务或控制器中注入 `FileReaderService`：

```typescript
import { Injectable } from '@nestjs/common';
import { FileReaderService } from '../shared/file-reader/file-reader.service';

@Injectable()
export class YourService {
  constructor(private readonly fileReaderService: FileReaderService) {}

  // 使用服务...
}
```

### 3. 调用方法

#### 基本用法 - 读取所有文件

```typescript
const content = await this.fileReaderService.readAndConcatFiles('/path/to/folder');
```

#### 指定分隔符

```typescript
const content = await this.fileReaderService.readAndConcatFiles(
  '/path/to/folder',
  '===自定义分隔符==='
);
```

#### 过滤特定扩展名的文件

```typescript
// 只读取 .md 和 .txt 文件
const content = await this.fileReaderService.readAndConcatFiles(
  '/path/to/folder',
  '---分割线---',
  ['.md', '.txt']
);
```

#### 只获取文件列表（不读取内容）

```typescript
const files = await this.fileReaderService.listFiles('/path/to/folder', ['.md']);
console.log(files); // ['file1.md', 'file2.md', ...]
```

## API 说明

### readAndConcatFiles

读取文件夹下所有文件并拼接内容。

**参数：**
- `folderPath` (string): 文件夹路径
- `separator` (string, 可选): 分隔符，默认为 `'---分割线---'`
- `fileExtensions` (string[], 可选): 文件扩展名过滤数组，如 `['.md', '.txt']`，为空则读取所有文件

**返回值：**
- `Promise<string>`: 拼接后的文件内容字符串

**示例输出：**
```
# 文件: intro.md
这是介绍文件的内容...

---分割线---

# 文件: chapter1.md
这是第一章的内容...

---分割线---

# 文件: chapter2.md
这是第二章的内容...
```

### listFiles

获取文件夹下所有文件的列表（不包含内容）。

**参数：**
- `folderPath` (string): 文件夹路径
- `fileExtensions` (string[], 可选): 文件扩展名过滤数组

**返回值：**
- `Promise<string[]>`: 文件名数组

## 注意事项

1. 服务会自动跳过无法读取的文件，并在日志中记录错误
2. 如果文件夹中没有符合条件的文件，返回空字符串
3. 每个文件的内容前会添加文件名作为标识，便于区分
4. 使用 UTF-8 编码读取文件
5. 只会读取直接位于指定文件夹下的文件，不会递归读取子目录

## 错误处理

服务会在以下情况抛出错误：
- 文件夹路径不存在
- 提供的路径不是目录

建议在调用时使用 try-catch 进行错误处理：

```typescript
try {
  const content = await this.fileReaderService.readAndConcatFiles('/path/to/folder');
  // 处理内容...
} catch (error) {
  console.error('读取文件失败:', error.message);
}
```
