# 人物-会话关系设计重构说明

## 重构原因

之前的设计中，在 `Character` 模型中存储 `sessionIds` 数组来表示人物与会话的关联关系。这种设计存在以下问题：

1. **不符合业务逻辑**：业务规则是"一个会话只能对应一个人物"，但反过来"一个人物可以被多个会话使用"
2. **数据冗余**：需要在 Character 中维护 sessionIds 数组，增加了数据一致性维护的复杂度
3. **查询效率低**：查找某个会话绑定的人物时，需要遍历所有 Character 的 sessionIds 数组

## 新的设计方案

### 核心思想

**在 Session 中存储 characterId**，而不是在 Character 中存储 sessionIds。

这样设计的优势：
- ✅ 符合"一个会话只能对应一个人物"的业务规则
- ✅ 数据结构更清晰，关系更明确
- ✅ 查询效率更高（直接通过 sessionId 查找）
- ✅ 减少数据冗余和维护成本

### 数据模型变更

#### 1. Session Schema 变更

**文件**: `/server/src/modules/session/schemas/session.schema.ts`

```typescript
@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true, unique: true })
  sessionId: string;

  @Prop({ default: '新会话' })
  title: string;

  @Prop({ default: '' })
  summary: string;

  @Prop({ default: '' })
  category: string;

  @Prop({ default: '' })
  novelCode: string;

  // 新增：关联的人物ID（一个会话只能对应一个人物）
  @Prop({ default: '' })
  characterId: string;
}
```

#### 2. Character Schema 变更

**文件**: `/server/src/modules/character/schemas/character.schema.ts`

```typescript
@Schema({ timestamps: true })
export class Character {
  @Prop({ required: true, unique: true })
  characterId: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  gender: number;

  @Prop({ required: true })
  age: number;

  @Prop()
  appearance?: string;

  @Prop({ required: true })
  profession: string;

  @Prop({ required: true })
  personalityOverview: string;

  @Prop({ required: true, type: [String] })
  personalityTags: string[];

  @Prop({ type: [String] })
  behaviorDescriptions?: string[];

  // 移除了 sessionIds 字段
}
```

### DTO 变更

#### 1. CreateSessionDto

**文件**: `/server/src/modules/session/dto/create-session.dto.ts`

```typescript
export class CreateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  novelCode?: string;

  // 新增：可以在创建会话时直接绑定人物
  @IsOptional()
  @IsString()
  characterId?: string;
}
```

#### 2. UpdateSessionDto

**文件**: `/server/src/modules/session/dto/update-session.dto.ts`

```typescript
export class UpdateSessionDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  novelCode?: string;

  // 新增：可以更新会话绑定的人物
  @IsOptional()
  @IsString()
  characterId?: string;
}
```

### Service 层变更

#### CharacterService 重构

**文件**: `/server/src/modules/character/character.service.ts`

主要变更：

1. **注入 Session 模型**：需要操作 Session 来管理绑定关系

```typescript
constructor(
  @InjectModel(Character.name) private characterModel: Model<CharacterDocument>,
  @InjectModel(Session.name) private sessionModel: Model<SessionDocument>, // 新增
) {}
```

2. **create 方法**：移除 sessionIds 初始化

```typescript
async create(createCharacterDto: CreateCharacterDto): Promise<Character> {
  const characterId = `char_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const createdCharacter = new this.characterModel({
    characterId,
    ...createCharacterDto,
    // 移除了 sessionIds: []
  });

  return createdCharacter.save();
}
```

3. **bindToSession 方法**：改为更新 Session 的 characterId

```typescript
async bindToSession(bindDto: BindCharacterToSessionDto): Promise<Character> {
  const { characterId, sessionId } = bindDto;

  // 验证人物是否存在
  const character = await this.characterModel.findOne({ characterId }).exec();
  if (!character) {
    throw new NotFoundException(`Character ${characterId} not found`);
  }

  // 验证会话是否存在
  const session = await this.sessionModel.findOne({ sessionId }).exec();
  if (!session) {
    throw new NotFoundException(`Session ${sessionId} not found`);
  }

  // 检查该会话是否已经绑定了人物
  if (session.characterId) {
    throw new NotFoundException(
      `Session ${sessionId} already bound to character ${session.characterId}`,
    );
  }

  // 在Session中设置characterId
  await this.sessionModel
    .findOneAndUpdate(
      { sessionId },
      { $set: { characterId } },
      { new: true },
    )
    .exec();

  return character;
}
```

4. **findBySessionId 方法**：先查 Session 获取 characterId，再查 Character

```typescript
async findBySessionId(sessionId: string): Promise<Character | null> {
  // 先查询会话获取characterId
  const session = await this.sessionModel.findOne({ sessionId }).exec();

  if (!session || !session.characterId) {
    return null;
  }

  // 再查询对应的人物
  const character = await this.characterModel
    .findOne({ characterId: session.characterId })
    .exec();

  return character;
}
```

5. **unbindFromSession 方法**：清除 Session 的 characterId

```typescript
async unbindFromSession(characterId: string, sessionId: string): Promise<Character> {
  // 验证人物和会话
  const character = await this.characterModel.findOne({ characterId }).exec();
  if (!character) {
    throw new NotFoundException(`Character ${characterId} not found`);
  }

  const session = await this.sessionModel.findOne({ sessionId }).exec();
  if (!session) {
    throw new NotFoundException(`Session ${sessionId} not found`);
  }

  // 检查会话是否绑定了该人物
  if (session.characterId !== characterId) {
    throw new NotFoundException(
      `Session ${sessionId} is not bound to character ${characterId}`,
    );
  }

  // 清除Session中的characterId
  await this.sessionModel
    .findOneAndUpdate(
      { sessionId },
      { $set: { characterId: '' } },
      { new: true },
    )
    .exec();

  return character;
}
```

### 前端 API 变更

**文件**: `/client/src/api/character.ts`

从 Character 接口中移除 `sessionIds` 字段：

```typescript
export interface Character {
  characterId: string
  name: string
  gender: number
  age: number
  appearance: string
  profession: string
  personalityOverview: string
  personalityTags: string[]
  behaviorDescriptions: string[]
  // 移除了 sessionIds: string[]
  createdAt: string
  updatedAt: string
}
```

## 数据迁移建议

如果数据库中已有旧数据，需要进行数据迁移：

### 迁移脚本示例

```javascript
// MongoDB 迁移脚本
db.sessions.find({}).forEach(session => {
  // 这里需要根据实际情况处理
  // 如果之前没有在Character中存储sessionIds，则无需迁移
  // 如果有，需要从Character的sessionIds反向填充到Session的characterId
});
```

**注意**：由于这是一个新功能，如果还没有生产数据，可以跳过迁移步骤。

## API 接口变化

### 不变的接口

以下接口的请求和响应格式保持不变：

- `POST /characters/create` - 创建人物
- `POST /characters/list` - 获取人物列表
- `POST /characters/detail` - 获取人物详情
- `POST /characters/update` - 更新人物
- `POST /characters/delete` - 删除人物

### 行为变化的接口

#### 1. 绑定人物到会话

**接口**: `POST /characters/bind-session`

**请求体**:
```json
{
  "characterId": "char_xxx",
  "sessionId": "session_xxx"
}
```

**响应**: 返回人物信息（不变）

**内部实现**: 现在是更新 Session 的 characterId，而不是更新 Character 的 sessionIds

#### 2. 获取会话绑定的人物

**接口**: `POST /characters/find-by-session`

**请求体**:
```json
{
  "sessionId": "session_xxx"
}
```

**响应**: 返回人物信息或 null（不变）

**内部实现**: 先查询 Session 获取 characterId，再查询对应的 Character

#### 3. 解绑人物

**接口**: `POST /characters/unbind-session`

**请求体**:
```json
{
  "characterId": "char_xxx",
  "sessionId": "session_xxx"
}
```

**响应**: 返回人物信息（不变）

**内部实现**: 清除 Session 的 characterId

## 优势总结

### 1. 符合业务逻辑
- "一个会话只能对应一个人物"的规则通过 Session.characterId 自然体现
- 不需要额外的验证逻辑来保证这个规则

### 2. 数据一致性更好
- 只需要维护一个方向的引用（Session → Character）
- 避免了双向同步的问题

### 3. 查询效率更高
- 查找会话绑定的人物：O(1) 直接查询
- 之前需要遍历所有 Character 的 sessionIds 数组

### 4. 扩展性更好
- 如果未来需要支持"一个会话多个人物"，可以轻松改为数组
- 如果需要在 Session 中添加更多人物相关的元数据，也很方便

### 5. 代码更简洁
- Character 模型更纯粹，只关注人物信息
- 关系管理集中在 Session 侧

## 注意事项

1. **向后兼容**：如果已有前端代码依赖 `sessionIds` 字段，需要更新
2. **数据库索引**：建议在 `sessions.characterId` 上添加索引以提高查询性能
3. **事务处理**：绑定/解绑操作涉及两个集合，在生产环境中建议使用事务

## 测试建议

1. 测试创建人物（确保不包含 sessionIds）
2. 测试创建会话时可以指定 characterId
3. 测试绑定人物到会话
4. 测试获取会话绑定的人物
5. 测试解绑人物
6. 测试一个人物被多个会话使用
7. 测试一个会话不能重复绑定人物
