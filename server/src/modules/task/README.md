# 任务模块

这是一个完整的任务管理模块，包含前端和后端实现。

## 功能特性

- ✅ 任务列表展示
- 🔍 多条件搜索（任务名称、状态、优先级、负责人）
- ➕ 新建任务
- ✏️ 编辑任务
- 🗑️ 删除任务
- 📊 按状态筛选
- 👤 按负责人筛选

## 数据模型

### 任务字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| name | string | ✅ | 任务名称 |
| description | string | ❌ | 任务描述 |
| status | TaskStatus | ✅ | 任务状态 |
| priority | TaskPriority | ✅ | 优先级 |
| assignee | string | ❌ | 负责人 |
| dueDate | Date | ❌ | 截止日期 |
| completedAt | Date | ❌ | 完成时间 |
| tags | string[] | ❌ | 标签数组 |

### 任务状态 (TaskStatus)

- `pending` - 待处理
- `in_progress` - 进行中
- `completed` - 已完成
- `cancelled` - 已取消

### 优先级 (TaskPriority)

- `low` - 低
- `medium` - 中
- `high` - 高

## 后端 API

### 基础路径
```
/tasks
```

### API 端点

#### 1. 获取所有任务
```http
GET /tasks
```

#### 2. 根据 ID 获取任务
```http
GET /tasks/:id
```

#### 3. 创建任务
```http
POST /tasks
Content-Type: application/json

{
  "name": "任务名称",
  "description": "任务描述",
  "status": "pending",
  "priority": "medium",
  "assignee": "张三",
  "dueDate": "2024-12-31",
  "tags": ["重要", "紧急"]
}
```

#### 4. 更新任务
```http
PUT /tasks/:id
Content-Type: application/json

{
  "name": "更新后的任务名称",
  "status": "in_progress"
}
```

#### 5. 删除任务
```http
DELETE /tasks/:id
```

#### 6. 按状态查询任务
```http
GET /tasks/status/:status
```

#### 7. 按负责人查询任务
```http
GET /tasks/assignee/:assignee
```

## 前端使用

### 访问页面

路由路径：`/task`

### 组件位置

- 页面组件：`client/src/pages/task/task-list.vue`
- API 文件：`client/src/api/task.ts`
- 枚举定义：`client/src/enums/task-enum.ts`

### 使用方法

1. **查看任务列表**
   - 默认显示所有任务
   - 支持分页显示（10/20/30/40 条/页）

2. **搜索任务**
   - 输入任务名称
   - 选择任务状态
   - 选择优先级
   - 输入负责人
   - 点击"查询"按钮

3. **新建任务**
   - 点击"新建任务"按钮
   - 填写表单信息
   - 点击"确定"保存

4. **编辑任务**
   - 点击操作列的"编辑"按钮
   - 修改表单信息
   - 点击"确定"保存

5. **删除任务**
   - 点击操作列的"删除"按钮
   - 确认删除

## 技术栈

### 后端
- NestJS
- MongoDB + Mongoose
- class-validator (表单验证)

### 前端
- Vue 3 + Composition API
- Ant Design Vue
- TypeScript

## 文件结构

```
server/src/modules/task/
├── dto/
│   └── task.dto.ts          # DTO 定义和验证规则
├── schemas/
│   └── task.schema.ts       # MongoDB Schema 定义
├── task.controller.ts       # 控制器（路由定义）
├── task.module.ts          # 模块配置
├── task.repository.ts      # 数据访问层
└── task.service.ts         # 业务逻辑层

client/src/
├── api/
│   └── task.ts             # 前端 API 调用
├── enums/
│   └── task-enum.ts        # 枚举定义
└── pages/
    └── task/
        └── task-list.vue   # 任务列表页面
```

## 开发指南

### 添加新字段

1. 在 `server/src/modules/task/dto/task.dto.ts` 中添加 DTO 字段
2. 在 `server/src/modules/task/schemas/task.schema.ts` 中添加 Schema 字段
3. 在前端 `client/src/api/task.ts` 中更新 TaskModel 接口
4. 在 `client/src/pages/task/task-list.vue` 中添加对应的表单和表格列

### 自定义验证规则

在 DTO 文件中添加相应的 class-validator 装饰器：

```typescript
@IsNotEmpty()
@IsString()
fieldName: string;
```

### 扩展 API

在 Controller 中添加新的路由方法：

```typescript
@Get('custom-endpoint')
async customMethod() {
  // 实现逻辑
}
```

## 注意事项

1. 确保 MongoDB 数据库已正确配置并运行
2. 后端服务启动前，确保已安装依赖：`pnpm install`
3. 前端需要确保 Ant Design Vue 组件已正确引入
4. 删除操作会有二次确认，防止误删

## 示例数据

```json
{
  "name": "完成项目文档",
  "description": "编写任务模块的使用文档",
  "status": "in_progress",
  "priority": "high",
  "assignee": "张三",
  "dueDate": "2024-12-31T00:00:00.000Z",
  "tags": ["文档", "重要"]
}
```
