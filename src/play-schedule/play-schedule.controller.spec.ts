import { Test, TestingModule } from '@nestjs/testing';
import { PlayScheduleController } from './play-schedule.controller';

describe('PlayScheduleController', () => {
  let controller: PlayScheduleController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PlayScheduleController],
    }).compile();

    controller = module.get<PlayScheduleController>(PlayScheduleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
