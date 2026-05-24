# 第二轮归纳进度保存与断点恢复设计

## 目标

当前第二轮归纳已经支持：

- 从 `novel_outlines` 读取第一轮结果
- 将 `characters` 复制到 `novel_characters`
- 将 `events` 复制到 `novel_events`
- 将 `worldView` 经过 LLM 归并后写入 `novel_worldView`

下一阶段需要补齐：

- 进度保存
- 失败状态记录
- 中断后继续执行
- 前端可视化进度展示

## 当前实现的局限

当前接口是同步执行的单次操作：

- 接口：`POST /novel-outline/start-second-pass`
- 服务入口：`NovelOutlineService.startSecondPass`

存在的问题：

- 没有任务表，无法记录执行状态
- 没有阶段字段，无法知道执行到哪一步
- 没有中止能力
- 没有断点恢复能力
- 在写入三张表时使用 `Promise.all`，异常时可能出现部分成功、部分失败

## 推荐设计

### 1. 新增任务表

建议新增集合：`novel_second_pass_jobs`

建议字段：

- `jobId`: 第二轮任务唯一 ID
- `novelCode`: 小说编码
- `status`: `pending | running | done | failed | aborted`
- `currentStage`: 当前阶段名
- `stageProgress`: 阶段进度，当前版本可先用数字或枚举
- `lastError`: 最近一次错误信息
- `startedAt`: 开始时间
- `finishedAt`: 完成时间
- `resumeCount`: 恢复执行次数
- `resultSnapshot`: 可选，记录本次归纳的摘要信息

### 2. 将第二轮拆为明确阶段

建议拆成以下顺序步骤：

1. `prepare`
2. `copy_characters`
3. `copy_events`
4. `consolidate_world_view`
5. `save_world_view`
6. `finish`

这样每完成一步都可以持久化任务状态。

### 3. worldView 单独保存中间结果

`worldView` 是唯一依赖 LLM 的阶段，建议单独记录：

- `rawWorldViewInput`
- `mergedWorldViewDraft`
- `worldViewUpdatedAt`

这样如果 LLM 已经跑完，但最终落库前中断，就不需要再次请求模型。

### 4. 恢复策略

恢复时按 `currentStage` 判断：

- 如果停在 `copy_characters` 前，从头开始拷贝人物
- 如果人物已完成，直接跳过人物
- 如果事件已完成，直接跳过事件
- 如果 `mergedWorldViewDraft` 已存在，直接执行 `save_world_view`
- 如果 `consolidate_world_view` 未完成，重新调用 LLM

### 5. 幂等性要求

每个阶段都要幂等：

- `copy_characters`: 通过 `novelCode` 覆盖写入
- `copy_events`: 通过 `novelCode` 覆盖写入
- `save_world_view`: 通过 `novelCode` 覆盖写入

即使同一阶段重复执行，也不应产生重复数据。

## 推荐接口

### 启动/继续第二轮

`POST /novel-outline/start-second-pass`

行为建议：

- 若无任务，创建新任务
- 若存在 `failed` / `aborted` 任务，则从断点恢复
- 若存在 `running` 任务，则直接返回当前任务状态

### 查询第二轮任务状态

`POST /novel-outline/get-second-pass-job`

入参：

- `novelCode` 或 `jobId`

返回：

- 当前状态
- 当前阶段
- 错误信息
- 是否可恢复

### 中止第二轮任务

`POST /novel-outline/abort-second-pass`

## 前端改造建议

页面增加一个“第二轮任务进度”区域，至少展示：

- 当前状态
- 当前阶段
- 最近错误
- 开始时间
- 完成时间

按钮建议：

- `开始第二轮归纳`
- `继续第二轮归纳`
- `中止第二轮归纳`
- `刷新第二轮状态`

## 后端实现顺序建议

建议按下面顺序落地：

1. 新增 `novel_second_pass_jobs` schema
2. 新增 `findSecondPassJob`
3. 将 `startSecondPass` 改成任务驱动
4. 每阶段写入状态
5. 增加 `abortSecondPass`
6. 前端接第二轮任务状态展示

## 本次实现完成后需要注意

本次已经有结果查询接口：

- `POST /novel-outline/get-second-pass`

因此下次补“断点恢复”时，不需要改动第二轮结果展示结构，只需要补任务层和前端进度展示即可。
