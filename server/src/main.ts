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
      whitelist: true, // 自动移除未声明的参数
      forbidNonWhitelisted: true, // 如果遇到未声明的参数则抛出错误
      transform: true, // 自动转换载荷为 ES6 类实例
      stopAtFirstError: true, // 发现第一个错误就停止校验
    }),
  );
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
