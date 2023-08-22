import { Controller, Get, OnModuleInit, Render } from '@nestjs/common';

@Controller('player')
export class PlayerController implements OnModuleInit {
  async onModuleInit() {
    console.log(
      process.env.SERVER_ENDPOINT + '/api/player',
      ' 에 접속하여 라즈베리파이를 활성화하세요',
    );
  }

  @Get('/')
  @Render('player.ejs')
  async player() {
    return {
      endpoint: process.env.SERVER_ENDPOINT,
    };
  }
}
