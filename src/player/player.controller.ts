import { Controller, Get, Render } from '@nestjs/common';

@Controller('player')
export class PlayerController {
  @Get('/')
  @Render('player.ejs')
  async player() {
    return {
      endpoint: process.env.SERVER_ENDPOINT,
    };
  }
}
