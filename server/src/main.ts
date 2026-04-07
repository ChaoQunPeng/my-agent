/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2026-04-07 09:53:16
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-04-07 10:40:34
 * @FilePath: /my-agent/server/src/main.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.useGlobalFilters(new HttpExceptionFilter());
  // 启用全局参数校验管道
  app.useGlobalPipes(
    new ValidationPipe({
      // 自动移除 DTO 中未用装饰器声明的字段
      // 例：DTO 只声明了 title，前端传了 { title: '测试', hackField: '恶意数据' }
      //     → Service 实际收到的是 { title: '测试' }，hackField 被静默删除
      whitelist: true,

      // 控制发现多余字段时的行为（需配合 whitelist: true 使用）
      // false（当前）→ 静默删除多余字段，不报错
      // true         → 直接返回 400，告诉前端"你传了不该传的字段"
      forbidNonWhitelisted: false,

      // 自动把请求 Body 转成 DTO 类的实例，使类型转换装饰器生效
      // 例：前端传字符串 "123"，DTO 里用了 @Type(() => Number)
      //     → transform: true 会自动把 "123" 转成数字 123
      transform: true,

      // 校验失败时只返回第一个错误，不把所有错误一起返回
      // true（当前）→ DTO 有 3 个字段校验失败，只返回第 1 个错误
      // false       → 3 个错误一起返回
      stopAtFirstError: true,
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
