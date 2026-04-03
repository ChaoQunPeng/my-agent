import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { OpenaiModule } from './shared/openai/openai.module';
import { ChatModule } from './modules/chat/chat.module';
import { UserModule } from './modules/user/user.module';
import { TaskModule } from './modules/task/task.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env.local',
      isGlobal: true,
    }),
    OpenaiModule,
    ChatModule,
    UserModule,
    TaskModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
