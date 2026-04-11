---
trigger: always_on
---

# 必须需遵循的规则

- 每次新的对话都必须阅读根目录下的 PROJECT_STRUCTURE.md 的内容
- 生成代码的时候必须有注释
- 禁止修改用户已经修改了的代码,在用户修改的代码基础上进行修改

### 前端

- 在没有明确要求的情况下,不要修改既有的样式

### 后端

- 接口使用 RPC 风格，使用 POST 请求，请求体为 JSON 格式，返回体为 JSON 格式
- 接口地址使用 kebab-case 命名
- 接口返回值都要使用 ApiResponseDto 封装
