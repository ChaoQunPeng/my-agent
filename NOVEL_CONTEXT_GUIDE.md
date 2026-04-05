# 小说上下文管理功能使用说明

## 功能概述

本功能为写作助手提供了一个专门的小说配置管理界面，允许用户为每个会话保存和管理小说的上下文信息，包括世界观、角色设定、写作风格等。

## 后端实现

### 1. 数据模型 (NovelConfig)

位置: `server/src/modules/novel-context/schemas/novel-config.schema.ts`

主要字段：
- **基础信息**: title, synopsis（简介）
- **世界观**: world_background, world_logic_rules, world_geography
- **粗纲**: main_outline
- **角色设定**: characters_list（数组）
- **写作指令**: writing_perspective, writing_tone, target_word_count
- **禁止事项**: avoid_plots, forbidden_words, logic_redlines
- **阶段性目标**: volume_goal, chapter_goal

### 2. API 接口

#### POST /novel-context
创建或更新小说配置（基于 sessionId）

**请求体示例：**
```json
{
  "sessionId": "session_123",
  "title": "我的小说",
  "synopsis": "一个少年成长为英雄的故事",
  "world_background": "修仙世界",
  "main_outline": "从凡人到仙人的成长历程",
  "writing_tone": "通俗网文风格",
  "characters_list": [
    {
      "name": "主角",
      "identity": "落魄少年",
      "personality": "坚韧不拔",
      "goals": "成为最强仙人",
      "traits": "黑发黑眸"
    }
  ],
  "writing_perspective": "第三人称有限视角",
  "target_word_count": 2000
}
```

#### GET /novel-context/:sessionId
根据 sessionId 获取小说配置

#### POST /novel-context/:sessionId
更新小说配置

#### DELETE /novel-context/:sessionId
删除小说配置

## 前端实现

### 1. API 接口

位置: `client/src/api/novel-context.ts`

提供了以下方法：
- `createOrUpdateNovelConfig(data)` - 创建或更新配置
- `getNovelConfig(sessionId)` - 获取配置
- `updateNovelConfig(sessionId, data)` - 更新配置
- `deleteNovelConfig(sessionId)` - 删除配置

### 2. 写作助手组件

位置: `client/src/pages/dialog/components/writing-assistant.vue`

组件特点：
- 自动关联当前会话的 sessionId
- 所有字段独立保存，每个文本域下方都有保存按钮
- 支持动态添加/删除角色
- 数组字段（避雷点、禁忌词）使用换行分隔输入

### 3. 集成到对话页面

位置: `client/src/pages/dialog/index.vue`

在素材区域（material-area）中集成了写作助手组件：
```vue
<div class="material-area">
  <WritingAssistant v-if="currentSessionId" :session-id="currentSessionId" />
</div>
```

## 使用方法

1. **启动后端服务**
   ```bash
   cd server
   npm run start:dev
   ```

2. **启动前端服务**
   ```bash
   cd client
   npm run dev
   ```

3. **访问写作助手**
   - 进入写作助手页面（如：一拳破天）
   - 创建或选择一个会话
   - 在右侧素材区域会显示小说配置面板
   - 填写各个字段并点击保存

4. **字段说明**
   
   **必填字段：**
   - 简介：一句话核心梗/冲突
   - 粗纲：故事主脉络
   - 角色设定：至少添加一个角色
   - 叙事人称：选择第一人称或第三人称
   - 文风基调：描述写作风格
   - 单章字数：建议每章生成的字数

   **选填字段：**
   - 世界观相关：时代背景、力量规则、地理分布
   - 禁止事项：避雷剧情、禁忌词、逻辑红线
   - 阶段性目标：本卷任务、本章目标

## 注意事项

1. 所有配置都通过 sessionId 关联，切换会话会自动加载对应的配置
2. 每个字段独立保存，修改后需要点击对应的保存按钮
3. 角色可以动态添加和删除，修改后点击"保存角色"按钮
4. 数组字段（避雷点、禁忌词）每行输入一个项目
5. 配置数据会持久化保存到 MongoDB

## 技术栈

- **后端**: NestJS + Mongoose
- **前端**: Vue 3 + TypeScript + Ant Design Vue
- **数据库**: MongoDB
