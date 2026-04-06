# 人物管理API测试示例

## 测试环境
- 后端地址: http://localhost:3000
- 所有接口使用POST请求

## 1. 创建人物

```bash
curl -X POST http://localhost:3000/characters/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "张三",
    "gender": 1,
    "age": 28,
    "appearance": "眼神坚定，眉宇间透露着自信，总是穿着整洁的衬衫",
    "profession": "软件工程师，习惯于用逻辑思维分析问题，追求代码的完美",
    "personalityOverview": "外表冷静理性，内心充满激情，追求完美但有时过于苛求自己和他人的表现",
    "personalityTags": ["理性", "完美主义", "执着", "严谨"],
    "behaviorDescriptions": [
      "遇到问题时先分析根本原因，再制定详细的解决方案",
      "面对压力时会更加专注，但可能忽略周围人的感受",
      "喜欢提前规划，对突发情况会感到不适"
    ]
  }'
```

**预期响应**:
```json
{
  "code": 200,
  "msg": "人物创建成功",
  "data": {
    "characterId": "char_xxx_xxx",
    "name": "张三",
    "gender": 1,
    "age": 28,
    ...
  }
}
```

## 2. 获取人物列表

```bash
curl -X POST http://localhost:3000/characters/list \
  -H "Content-Type: application/json" \
  -d '{}'
```

**预期响应**:
```json
{
  "code": 200,
  "msg": "success",
  "data": [
    {
      "characterId": "char_xxx_xxx",
      "name": "张三",
      ...
    }
  ]
}
```

## 3. 获取人物详情

```bash
curl -X POST http://localhost:3000/characters/detail \
  -H "Content-Type: application/json" \
  -d '{
    "id": "char_xxx_xxx"
  }'
```

## 4. 更新人物

```bash
curl -X POST http://localhost:3000/characters/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": "char_xxx_xxx",
    "age": 29,
    "personalityTags": ["理性", "完美主义", "执着", "严谨", "创新"]
  }'
```

## 5. 删除人物

```bash
curl -X POST http://localhost:3000/characters/delete \
  -H "Content-Type: application/json" \
  -d '{
    "id": "char_xxx_xxx"
  }'
```

## 6. 绑定人物到会话

首先需要创建一个会话（假设sessionId为session_xxx）：

```bash
curl -X POST http://localhost:3000/characters/bind-session \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_xxx_xxx",
    "sessionId": "session_xxx_xxx"
  }'
```

## 7. 获取会话绑定的人物

```bash
curl -X POST http://localhost:3000/characters/find-by-session \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "session_xxx_xxx"
  }'
```

**预期响应**:
```json
{
  "code": 200,
  "msg": "success",
  "data": {
    "characterId": "char_xxx_xxx",
    "name": "张三",
    "sessionIds": ["session_xxx_xxx"],
    ...
  }
}
```

## 8. 从会话解绑人物

```bash
curl -X POST http://localhost:3000/characters/unbind-session \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_xxx_xxx",
    "sessionId": "session_xxx_xxx"
  }'
```

## 完整测试流程

### 步骤1: 创建多个人物

```bash
# 创建第一个人物
curl -X POST http://localhost:3000/characters/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "李四",
    "gender": 2,
    "age": 25,
    "appearance": "温柔可人，笑容甜美",
    "profession": "心理咨询师，善于倾听和理解他人",
    "personalityOverview": "温和包容，富有同理心，但有时会过度承担他人的情绪负担",
    "personalityTags": ["温柔", "同理心", "耐心"],
    "behaviorDescriptions": [
      "善于观察他人的情绪变化并主动提供帮助",
      "在冲突中倾向于调和而非对抗"
    ]
  }'

# 记录返回的characterId
```

### 步骤2: 创建会话

```bash
curl -X POST http://localhost:3000/sessions/create \
  -H "Content-Type: application/json" \
  -d '{
    "category": "chat",
    "title": "测试会话"
  }'

# 记录返回的sessionId
```

### 步骤3: 绑定人物到会话

```bash
curl -X POST http://localhost:3000/characters/bind-session \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "刚才记录的characterId",
    "sessionId": "刚才记录的sessionId"
  }'
```

### 步骤4: 验证绑定

```bash
curl -X POST http://localhost:3000/characters/find-by-session \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "刚才记录的sessionId"
  }'
```

## 错误处理测试

### 测试1: 缺少必填字段

```bash
curl -X POST http://localhost:3000/characters/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "测试"
  }'
```

应该返回错误，提示缺少必填字段。

### 测试2: 绑定不存在的会话

```bash
curl -X POST http://localhost:3000/characters/bind-session \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_xxx_xxx",
    "sessionId": "nonexistent_session"
  }'
```

### 测试3: 重复绑定同一会话

```bash
# 第一次绑定
curl -X POST http://localhost:3000/characters/bind-session \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_xxx_xxx",
    "sessionId": "session_xxx_xxx"
  }'

# 第二次绑定同一会话（应该失败）
curl -X POST http://localhost:3000/characters/bind-session \
  -H "Content-Type: application/json" \
  -d '{
    "characterId": "char_xxx_xxx",
    "sessionId": "session_xxx_xxx"
  }'
```

应该返回错误，提示该会话已经绑定到此人物。

## 注意事项

1. 确保后端服务正在运行（默认端口3000）
2. 确保MongoDB连接正常
3. 实际测试时需要替换示例中的ID为真实返回的ID
4. 可以使用Postman或其他API测试工具进行测试
5. 建议按顺序执行测试步骤，确保数据一致性
