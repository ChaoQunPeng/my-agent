# 人物信息管理模块

## 概述

人物信息管理模块提供了完整的人物CRUD功能，以及将人物绑定到会话的能力。该模块可以帮助用户更好地管理和使用人物信息。

## 功能特性

### 后端功能

1. **人物信息管理**
   - 创建人物
   - 查询人物列表
   - 查询人物详情
   - 更新人物信息
   - 删除人物

2. **会话绑定**
   - 将人物绑定到指定会话
   - 查询会话绑定的人物
   - 从会话解绑人物

### 前端功能

1. **人物管理Tab**
   - 显示所有人物列表
   - 新建人物
   - 编辑人物信息
   - 删除人物

2. **当前会话Tab**
   - 选择人物并绑定到当前会话
   - 显示已绑定人物的详细信息
   - 绑定后不可更改（确保会话一致性）

## 数据结构

### 人物信息字段

| 字段名称 | 类型 | 必填 | 说明 |
|---------|------|------|------|
| characterId | String | 是 | 人物唯一标识ID（自动生成） |
| name | String | 是 | 真实姓名或代号 |
| gender | Number | 是 | 性别：0-未知, 1-男, 2-女 |
| age | Number | 是 | 年龄 |
| appearance | String | 否 | 外貌描述，侧重于神态和标志性特征 |
| profession | String | 是 | 职业，强调描述职业对思维方式的影响 |
| personalityOverview | String | 是 | 性格概述，描述矛盾点和内在驱动力 |
| personalityTags | Array[String] | 是 | 性格标签，关键性格锚点（3-5个） |
| behaviorDescriptions | Array[String] | 否 | 行为描述，核心是解决问题的逻辑、应对压力的反应 |
| sessionIds | Array[String] | 是 | 关联的会话ID列表 |
| createdAt | String | 是 | 创建时间（自动生成） |
| updatedAt | String | 是 | 更新时间（自动生成） |

## API接口

### 后端接口（RPC风格，POST请求）

#### 1. 创建人物
- **接口**: `/characters/create`
- **请求体**:
```json
{
  "name": "张三",
  "gender": 1,
  "age": 25,
  "appearance": "眼神坚定，眉宇间透露着自信",
  "profession": "软件工程师，习惯于用逻辑思维分析问题",
  "personalityOverview": "外表冷静理性，内心充满激情，追求完美但有时过于苛求",
  "personalityTags": ["理性", "完美主义", "执着"],
  "behaviorDescriptions": [
    "遇到问题时先分析根本原因，再制定解决方案",
    "面对压力时会更加专注，但可能忽略周围人的感受"
  ]
}
```
- **响应**:
```json
{
  "code": 200,
  "msg": "人物创建成功",
  "data": {
    "characterId": "char_xxx_xxx",
    "name": "张三",
    ...
  }
}
```

#### 2. 获取人物列表
- **接口**: `/characters/list`
- **请求体**: `{}`
- **响应**: 人物列表数组

#### 3. 获取人物详情
- **接口**: `/characters/detail`
- **请求体**: `{ "id": "characterId" }`
- **响应**: 人物详细信息

#### 4. 更新人物
- **接口**: `/characters/update`
- **请求体**: `{ "id": "characterId", ...更新字段 }`
- **响应**: 更新后的人物信息

#### 5. 删除人物
- **接口**: `/characters/delete`
- **请求体**: `{ "id": "characterId" }`
- **响应**: 删除成功消息

#### 6. 绑定人物到会话
- **接口**: `/characters/bind-session`
- **请求体**: `{ "characterId": "xxx", "sessionId": "xxx" }`
- **响应**: 更新后的人物信息

#### 7. 获取会话绑定的人物
- **接口**: `/characters/find-by-session`
- **请求体**: `{ "sessionId": "xxx" }`
- **响应**: 人物信息或null

#### 8. 从会话解绑人物
- **接口**: `/characters/unbind-session`
- **请求体**: `{ "characterId": "xxx", "sessionId": "xxx" }`
- **响应**: 更新后的人物信息

### 前端API

前端API封装在 `@/api/character.ts` 中，提供了以下方法：

```typescript
// 获取所有人物列表
getCharacters()

// 创建新人物
createCharacter(data)

// 获取人物详情
getCharacterDetail(characterId)

// 更新人物信息
updateCharacter(characterId, data)

// 删除人物
deleteCharacter(characterId)

// 绑定人物到会话
bindCharacterToSession(characterId, sessionId)

// 获取会话绑定的人物
getCharacterBySessionId(sessionId)

// 从会话解绑人物
unbindCharacterFromSession(characterId, sessionId)
```

## 使用说明

### 1. 人物管理

1. 切换到"人物管理"Tab
2. 点击"新建人物"按钮
3. 填写人物信息（带*的为必填项）
4. 点击确定保存
5. 在列表中点击人物可编辑
6. 点击删除按钮可删除人物

### 2. 绑定人物到会话

1. 切换到"当前会话"Tab
2. 在下拉框中选择要绑定的人物
3. 点击"确定绑定"按钮
4. 绑定成功后，会显示人物的详细信息
5. **注意：一个会话只能绑定一个人物，绑定后无法更改**

## 设计考虑

1. **数据一致性**: 会话绑定人物后不可更改，确保对话上下文的一致性
2. **用户体验**: 提供搜索功能，方便快速找到目标人物
3. **数据完整性**: 必填字段验证，确保人物信息的完整性
4. **可扩展性**: 一个人物可以被多个会话使用，通过sessionIds字段记录

## 技术实现

### 后端技术栈
- NestJS框架
- Mongoose (MongoDB ODM)
- TypeScript

### 前端技术栈
- Vue 3 Composition API
- Ant Design Vue
- TypeScript

### 数据库设计
- 使用MongoDB存储人物信息
- 采用Schema定义数据结构
- 使用timestamps自动管理创建和更新时间

## 注意事项

1. 删除人物前请确认没有重要会话在使用该人物
2. 性格标签建议控制在3-5个，过多会影响阅读体验
3. 行为描述应该具体描述人物的思维模式和行为习惯
4. 职业描述不要只是标签化，要体现对思维方式的影响
