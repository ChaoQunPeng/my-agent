# My Agent Skills

本目录包含了项目中使用的自定义 SKILL 定义，用于指导 AI 助手生成符合项目规范的代码。

## 📚 Skills 列表

### 1. nestjs-module-generator
- **文件路径**: `./nestjs-module-generator/SKILL.md`
- **用途**: 创建新的 NestJS 模块（后端 CRUD）
- **触发场景**: "帮我创建一个 product 模块"、"新建 order 模块"等
- **生成文件数**: 6 个后端文件

### 2. fullstack-crud-generator
- **文件路径**: `./fullstack-crud-generator/SKILL.md`
- **用途**: 创建完整的全栈 CRUD 模块（后端 + 前端）
- **触发场景**: "帮我全栈创建一个 product 模块"、"创建商品管理，前后端都要"等
- **生成文件数**: 9 个新文件 + 修改 2 个文件

### 3. vue-crud-generator
- **文件路径**: `./vue-crud-generator/SKILL.md`
- **用途**: 创建前端 Vue 3 CRUD 页面
- **触发场景**: "帮我创建 product 的前端页面"、"新建 order 管理页面"等
- **生成文件数**: 3 个前端文件 + 修改 1 个路由文件

## 🎯 命名规范

所有模块名遵循以下转换规则：
- **kebab-case**: `product-category`（文件名、目录名、路由前缀）
- **PascalCase**: `ProductCategory`（类名、Schema 名）
- **camelCase**: `productCategory`（变量名、注入属性名）
- **路由**: 复数形式（`product-categories`），`y` 结尾变 `ies`，其余加 `s`

## 🌟 API 接口风格规范

**重要**：本项目所有接口统一采用 **RPC 风格**，而非 RESTful 风格。

### RPC 风格特点

1. **所有请求使用 POST 方法**
   - ❌ 不使用 GET、PUT、DELETE 等 HTTP 动词
   - ✅ 统一使用 `@Post()` 装饰器

2. **URL 路径使用动词开头**
   - ❌ RESTful: `@Get()`, `@Get(':id')`, `@Delete(':id')`
   - ✅ RPC: `@Post('getTaskList')`, `@Post('getTaskById')`, `@Post('deleteTask')`

3. **所有参数通过 Body 传递**
   - ❌ 不使用 URL 路径参数（如 `/tasks/:id`）
   - ❌ 不使用查询字符串（如 `?id=1`）
   - ✅ 统一使用 `@Body()` 接收参数

### 示例对比

#### RESTful 风格（已过时）
```typescript
@Controller('tasks')
export class TaskController {
  @Get()
  async findAll() { ... }
  
  @Get(':id')
  async findById(@Param('id') id: string) { ... }
  
  @Delete(':id')
  async delete(@Param('id') id: string) { ... }
}
```

#### RPC 风格（当前标准）
```typescript
@Controller('task')
export class TaskController {
  @Post('getTaskList')
  async getTaskList(@Body() params?: any) { ... }
  
  @Post('getTaskById')
  async getTaskById(@Body() params: { id: string }) { ... }
  
  @Post('deleteTask')
  async deleteTask(@Body() params: { id: string }) { ... }
}
```

### 前端调用方式

```typescript
// ❌ RESTful 风格（已过时）
return useGet('/tasks', params);
return useDelete(`/tasks/${id}`);

// ✅ RPC 风格（当前标准）
return usePost('/task/getTaskList', params);
return usePost('/task/deleteTask', { id });
```

## 📝 使用方式

在新会话中，AI 助手可以自动读取 `.augment/skills/` 目录下的所有 `SKILL.md` 文件，并根据用户的请求应用相应的 SKILL。

## 🔄 版本历史

- v2.0: 全面更新为 RPC 风格（所有接口统一使用 POST 方法）
- 初始版本：包含 3 个核心 CRUD 生成 SKILL
