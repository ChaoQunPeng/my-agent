---
name: nestjs-module-generator
description: 当用户要求创建一个新的 NestJS 模块（如"帮我创建一个 product 模块"、"新建 order 模块"等）时，自动按照项目规范生成完整的 CRUD 模块文件。
---

# NestJS 模块生成规范

当用户要求创建新模块时，按照以下规范在 `server/src/modules/<kebab-name>/` 目录下生成 **6 个文件**。

## 命名规则

给定模块名（如 `product-category`）：
- **kebab-case**：`product-category`（文件名、目录名、路由前缀用复数）
- **PascalCase**：`ProductCategory`（类名、Schema 名）
- **camelCase**：`productCategory`（变量名、注入属性名）
- **路由**：复数形式（`product-categories`），`y` 结尾变 `ies`，其余加 `s`

## 必须生成的 6 个文件

### 1. `schemas/<kebab>.schema.ts`
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type {Pascal}Document = {Pascal} & Document;

@Schema({ timestamps: true })
export class {Pascal} {
  @Prop({ required: true })
  name: string;
  // TODO: 根据用户需求补充字段
}

export const {Pascal}Schema = SchemaFactory.createForClass({Pascal});
```

### 2. `dto/<kebab>.dto.ts`
```typescript
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class Create{Pascal}Dto {
  @IsNotEmpty()
  @IsString()
  name: string;
  // TODO: 根据用户需求补充字段
}

export class Update{Pascal}Dto {
  @IsOptional()
  @IsString()
  name?: string;
}
```

### 3. `<kebab>.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { {Pascal}, {Pascal}Document } from './schemas/<kebab>.schema';
import { Create{Pascal}Dto, Update{Pascal}Dto } from './dto/<kebab>.dto';

@Injectable()
export class {Pascal}Repository {
  constructor(
    @InjectModel({Pascal}.name) private readonly {camel}Model: Model<{Pascal}Document>,
  ) {}

  findAll(params?: { current?: number; pageSize?: number }): Promise<{ records: {Pascal}Document[]; total: number }> {
    const query = this.{camel}Model.find();
    const skip = params?.current && params?.pageSize ? (params.current - 1) * params.pageSize : 0;
    const limit = params?.pageSize || 0;
    
    return Promise.all([
      query.skip(skip).limit(limit).exec(),
      this.{camel}Model.countDocuments()
    ]).then(([records, total]) => ({ records, total }));
  }

  findById(id: string): Promise<{Pascal}Document | null> {
    return this.{camel}Model.findById(id).exec();
  }

  create(dto: Create{Pascal}Dto): Promise<{Pascal}Document> {
    return this.{camel}Model.create(dto);
  }

  update(id: string, dto: Update{Pascal}Dto): Promise<{Pascal}Document | null> {
    return this.{camel}Model.findByIdAndUpdate(id, dto, { new: true }).exec();
  }

  delete(id: string): Promise<{Pascal}Document | null> {
    return this.{camel}Model.findByIdAndDelete(id).exec();
  }
}
```

### 4. `<kebab>.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { {Pascal}Repository } from './<kebab>.repository';
import { Create{Pascal}Dto, Update{Pascal}Dto } from './dto/<kebab>.dto';

@Injectable()
export class {Pascal}Service {
  constructor(private readonly {camel}Repository: {Pascal}Repository) {}

  findAll(params?: { current?: number; pageSize?: number }) {
    return this.{camel}Repository.findAll(params);
  }

  async findById(id: string) {
    const item = await this.{camel}Repository.findById(id);
    if (!item) throw new NotFoundException(`{Pascal} ${id} 不存在`);
    return item;
  }

  create(dto: Create{Pascal}Dto) {
    return this.{camel}Repository.create(dto);
  }

  async update(id: string, dto: Update{Pascal}Dto) {
    await this.findById(id); // 确保任务存在
    return this.{camel}Repository.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id); // 确保任务存在
    return this.{camel}Repository.delete(id);
  }
}
```

### 5. `<kebab>.controller.ts`
```typescript
import { Controller, Post, Body } from '@nestjs/common';
import { {Pascal}Service } from './<kebab>.service';
import { Create{Pascal}Dto, Update{Pascal}Dto } from './dto/<kebab>.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('<route>')
export class {Pascal}Controller {
  constructor(private readonly {camel}Service: {Pascal}Service) {}

  @Post('get{Pascal}List')
  async get{Pascal}List(@Body() params?: any) {
    const data = await this.{camel}Service.findAll(params);
    return ApiResponseDto.success(data);
  }

  @Post('get{Pascal}ById')
  async get{Pascal}ById(@Body() dto: { id: string }) {
    const data = await this.{camel}Service.findById(dto.id);
    return ApiResponseDto.success(data);
  }

  @Post('create{Pascal}')
  async create{Pascal}(@Body() dto: Create{Pascal}Dto) {
    const data = await this.{camel}Service.create(dto);
    return ApiResponseDto.success(data, '创建成功');
  }

  @Post('update{Pascal}')
  async update{Pascal}(@Body() dto: Update{Pascal}Dto & { id: string }) {
    const { id, ...data } = dto;
    const result = await this.{camel}Service.update(id, data);
    return ApiResponseDto.success(result, '更新成功');
  }

  @Post('delete{Pascal}')
  async delete{Pascal}(@Body() dto: { id: string }) {
    await this.{camel}Service.delete(dto.id);
    return ApiResponseDto.success(null, '删除成功');
  }
}
```

### 6. `<kebab>.module.ts`
```typescript
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { {Pascal}, {Pascal}Schema } from './schemas/<kebab>.schema';
import { {Pascal}Repository } from './<kebab>.repository';
import { {Pascal}Service } from './<kebab>.service';
import { {Pascal}Controller } from './<kebab>.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: {Pascal}.name, schema: {Pascal}Schema }])],
  controllers: [{Pascal}Controller],
  providers: [{Pascal}Repository, {Pascal}Service],
  exports: [{Pascal}Service, {Pascal}Repository],
})
export class {Pascal}Module {}
```

## 最后一步

生成完所有文件后，提示用户在 `server/src/app.module.ts` 中注册新模块：
```
import { {Pascal}Module } from './modules/<kebab>/<kebab>.module';
// 在 imports 数组中加入: {Pascal}Module
```

## 注意事项
- 如果用户提供了具体字段（如「包含 title、price、stock 字段」），直接在 schema 和 dto 中生成对应字段，不要只放 `name`
- 始终保持与项目现有代码风格一致（Repository 模式、ApiResponseDto 包装）
- 生成后列出所有创建的文件路径，清晰明了

