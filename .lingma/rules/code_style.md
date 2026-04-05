---
trigger: always_on
---

# 注意事项

1. 在没有明确要求的情况下,不要修改既有的样式

# 代码风格

### 后端

1. 接口使用 RPC 风格，使用 POST 请求，请求体为 JSON 格式，返回体为 JSON 格式
2. 接口地址使用 kebab-case 命名
3. 接口返回值都要使用 ApiResponseDto 封装
