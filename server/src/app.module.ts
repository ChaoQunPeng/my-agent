/*
 * @Author: PengChaoQun 1152684231@qq.com
 * @Date: 2026-03-31 12:25:06
 * @LastEditors: PengChaoQun 1152684231@qq.com
 * @LastEditTime: 2026-04-03 16:29:07
 * @FilePath: /my-agent/server/src/app.module.ts
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { OpenaiModule } from './shared/openai/openai.module';
import { ChatModule } from './modules/chat/chat.module';
import { SessionModule } from './modules/session/session.module';
import { NovelContextModule } from './modules/novel-context/novel-context.module';
import { CharacterModule } from './modules/character/character.module';
// import { TaskModule } from './modules/task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    OpenaiModule,
    ChatModule,
    SessionModule,
    NovelContextModule,
    CharacterModule, // 注册人物模块
    // UserModule,
    // TaskModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
