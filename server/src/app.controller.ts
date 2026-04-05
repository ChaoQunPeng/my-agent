import { Controller, Post } from '@nestjs/common';

@Controller()
export class AppController {
  @Post('health')
  health(): { status: string } {
    return { status: 'ok' };
  }
}
