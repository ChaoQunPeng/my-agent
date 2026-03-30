import { defineEventHandler } from 'h3';

export default defineEventHandler(event => {
  const token = event.req.headers.get('Authorization');

  if (!token) {
    return {
      code: 401,
      msg: '未授权访问'
    };
  }

  // 退出登录成功，实际应用中可以在这里记录日志或清理会话
  return {
    code: 200,
    msg: '退出成功',
    data: null
  };
});
