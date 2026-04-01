import { defineEventHandler, readBody } from 'h3';

export default defineEventHandler(async event => {
  const body: any = await readBody(event);
  const { type } = body;
  
  const success = {
    code: 200,
    data: {
      token: ''
    },
    msg: '登录成功'
  };
  
  if (type !== 'mobile') {
    // 账号密码登录模式
    // 兼容 username 和 identifier 字段
    const username = body.username || body.identifier;
    
    // eslint-disable-next-line node/prefer-global/buffer
    success.data.token = Buffer.from(username).toString('base64');
    
    // 验证用户名密码
    if (username === 'admin' && body.password === 'admin') {
      return success;
    }
    
    if (username === 'user' && body.password === 'user') {
      return success;
    }
    
    // 验证失败
    event.res.statusCode = 401;
    return {
      code: 401,
      msg: '用户名或密码错误',
      data: null
    };
  } else {
    // 手机号验证码登录模式
    // 这里可以添加手机号和验证码的验证逻辑
    if (body.mobile && body.code) {
      // eslint-disable-next-line node/prefer-global/buffer
      success.data.token = Buffer.from(body.mobile).toString('base64');
      return success;
    }
    
    event.res.statusCode = 401;
    return {
      code: 401,
      msg: '手机号或验证码错误',
      data: null
    };
  }
});
