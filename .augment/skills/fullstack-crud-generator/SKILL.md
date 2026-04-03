---
name: fullstack-crud-generator
description: 当用户要求同时创建后端和前端的完整 CRUD 功能模块时（如"帮我全栈创建一个 product 模块"、"创建商品管理，前后端都要"），自动生成后端 NestJS 模块 + 前端 Vue 3 页面 + 数据库 Schema + 路由注册，完成全栈 CRUD 搭建。
---

# 全栈 CRUD 生成规范

当用户要求创建完整的前后端 CRUD 模块时，按顺序生成 **9 个文件** 并修改 **2 个已有文件**。

## 第一步：确认信息

在生成前，先确认以下信息（如用户已提供则直接生成）：
1. **模块名**（英文 kebab-case，如 `product`、`product-category`）
2. **字段列表**（字段名 + 类型 + 是否必填 + 中文标签），例如：
   - `name: string`（必填）名称
   - `price: number`（必填）价格
   - `stock: number`（可选）库存
3. **中文名称**（用于页面标题，如"商品"、"商品分类"）

## 第二步：命名转换

给定 `product-category`：
- **kebab**：`product-category`
- **Pascal**：`ProductCategory`
- **camel**：`productCategory`
- **路由（复数）**：`product-categories`（`y` 结尾变 `ies`，其余加 `s`）

## 第三步：生成后端文件（6个）

路径：`server/src/modules/<kebab>/`

### `schemas/<kebab>.schema.ts`
```typescript
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type {Pascal}Document = {Pascal} & Document;

@Schema({ timestamps: true })
export class {Pascal} {
  @Prop({ required: true })
  name: string;
  // 根据用户字段生成，数字用 @Prop({ type: Number })，可选字段用 required: false
}

export const {Pascal}Schema = SchemaFactory.createForClass({Pascal});
```

### `dto/<kebab>.dto.ts`
```typescript
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';

export class Create{Pascal}Dto {
  @IsNotEmpty() @IsString()
  name: string;
  // 根据字段类型选择 @IsString() / @IsNumber() / @IsOptional()
}

export class Update{Pascal}Dto {
  @IsOptional() @IsString()
  name?: string;
}
```

### `<kebab>.repository.ts`
```typescript
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { {Pascal}, {Pascal}Document } from './schemas/<kebab>.schema';
import { Create{Pascal}Dto, Update{Pascal}Dto } from './dto/<kebab>.dto';

@Injectable()
export class {Pascal}Repository {
  constructor(@InjectModel({Pascal}.name) private readonly {camel}Model: Model<{Pascal}Document>) {}

  findAll(params?: any): Promise<{ records: {Pascal}Document[]; total: number }> {
    const { current = 1, pageSize = 10, ...filter } = params ?? {};
    const query = this.{camel}Model.find(filter);
    return Promise.all([
      query.skip((current - 1) * pageSize).limit(pageSize).exec(),
      this.{camel}Model.countDocuments(filter)
    ]).then(([records, total]) => ({ records, total }));
  }

  findById(id: string) { return this.{camel}Model.findById(id).exec(); }
  create(dto: Create{Pascal}Dto) { return this.{camel}Model.create(dto); }
  update(id: string, dto: Update{Pascal}Dto) { return this.{camel}Model.findByIdAndUpdate(id, dto, { new: true }).exec(); }
  delete(id: string) { return this.{camel}Model.findByIdAndDelete(id).exec(); }
}
```

### `<kebab>.service.ts`
```typescript
import { Injectable, NotFoundException } from '@nestjs/common';
import { {Pascal}Repository } from './<kebab>.repository';
import { Create{Pascal}Dto, Update{Pascal}Dto } from './dto/<kebab>.dto';

@Injectable()
export class {Pascal}Service {
  constructor(private readonly {camel}Repository: {Pascal}Repository) {}

  findAll(params?: any) { return this.{camel}Repository.findAll(params); }

  async findById(id: string) {
    const item = await this.{camel}Repository.findById(id);
    if (!item) throw new NotFoundException(`{Pascal} ${id} 不存在`);
    return item;
  }

  create(dto: Create{Pascal}Dto) { return this.{camel}Repository.create(dto); }

  async update(id: string, dto: Update{Pascal}Dto) {
    await this.findById(id);
    return this.{camel}Repository.update(id, dto);
  }

  async delete(id: string) {
    await this.findById(id);
    return this.{camel}Repository.delete(id);
  }
}
```

### `<kebab>.controller.ts`
```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { {Pascal}Service } from './<kebab>.service';
import { Create{Pascal}Dto, Update{Pascal}Dto } from './dto/<kebab>.dto';
import { ApiResponseDto } from '../../common/dto/api-response.dto';

@Controller('<route>')
export class {Pascal}Controller {
  constructor(private readonly {camel}Service: {Pascal}Service) {}

  @Get()
  async findAll(@Query() params: any) {
    const data = await this.{camel}Service.findAll(params);
    return ApiResponseDto.success(data);
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    return ApiResponseDto.success(await this.{camel}Service.findById(id));
  }

  @Post()
  async create(@Body() dto: Create{Pascal}Dto) {
    return ApiResponseDto.success(await this.{camel}Service.create(dto), '创建成功');
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Update{Pascal}Dto) {
    return ApiResponseDto.success(await this.{camel}Service.update(id, dto), '更新成功');
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.{camel}Service.delete(id);
    return ApiResponseDto.success(null, '删除成功');
  }
}
```

### `<kebab>.module.ts`
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

## 第四步：生成前端文件（3个）

### `client/src/api/<kebab>/<kebab>.ts`
```typescript
interface {Pascal}Model {
  id?: string;
  name: string;
  // 根据用户字段生成
}
type {Pascal}Params = Partial<Omit<{Pascal}Model, 'id'>> & { current?: number; pageSize?: number };

export async function get{Pascal}ListApi(params?: {Pascal}Params) {
  return useGet<{ records: {Pascal}Model[]; total: number }>('/<route>', params);
}
export async function create{Pascal}Api(data: Omit<{Pascal}Model, 'id'>) {
  return usePost<{Pascal}Model>('/<route>', data);
}
export async function update{Pascal}Api(id: string, data: Partial<Omit<{Pascal}Model, 'id'>>) {
  return usePut<{Pascal}Model>(`/<route>/${id}`, data);
}
export async function delete{Pascal}Api(id: string) {
  return useDelete(`/<route>/${id}`);
}
export type { {Pascal}Model, {Pascal}Params };
```

### `client/src/pages/<kebab>/index.vue`
参考 `vue-crud-generator` SKILL 中的页面模板，包含：搜索表单 + 数据表格 + 新增/编辑/删除操作。

### `client/src/pages/<kebab>/components/<kebab>-modal.vue`
参考 `vue-crud-generator` SKILL 中的 modal 模板，包含：表单验证 + 新增/编辑接口调用。

## 第五步：修改已有文件

### 1. 注册后端模块 `server/src/app.module.ts`
在 `imports` 数组中加入：
```typescript
import { {Pascal}Module } from './modules/<kebab>/<kebab>.module';
// imports: [..., {Pascal}Module]
```

### 2. 注册前端路由 `client/src/router/dynamic-routes.ts`
在路由数组中加入：
```typescript
{
  path: '/<kebab>',
  name: '{Pascal}Index',
  component: () => import('~/pages/<kebab>/index.vue'),
  meta: { title: '{中文名}管理', icon: 'TableOutlined' }
}
```

## 完成后输出清单

生成完毕后，列出所有文件：
```
✅ 后端（6个新文件）:
  server/src/modules/<kebab>/schemas/<kebab>.schema.ts
  server/src/modules/<kebab>/dto/<kebab>.dto.ts
  server/src/modules/<kebab>/<kebab>.repository.ts
  server/src/modules/<kebab>/<kebab>.service.ts
  server/src/modules/<kebab>/<kebab>.controller.ts
  server/src/modules/<kebab>/<kebab>.module.ts

✅ 前端（3个新文件）:
  client/src/api/<kebab>/<kebab>.ts
  client/src/pages/<kebab>/index.vue
  client/src/pages/<kebab>/components/<kebab>-modal.vue

✅ 修改（2个已有文件）:
  server/src/app.module.ts（注册模块）
  client/src/router/dynamic-routes.ts（注册路由）

🌐 访问地址: http://localhost:端口/<kebab>
```

## 注意事项
- Repository 的 `findAll` 必须支持分页（`current`、`pageSize`），返回 `{ records, total }` 格式，这样前端 `useTableQuery` 才能正确处理
- 前端 `useGet`、`usePost`、`usePut`、`useDelete`、`ref`、`computed` 等均为全局自动导入，不需要 import
- 如果用户提供了具体字段，在所有相关文件中同步生成（schema、dto、model 接口、表格列、搜索参数、表单字段）

