import { Test, TestingModule } from '@nestjs/testing';
import { PlayScheduleService } from './play-schedule.service';

describe('PlayScheduleService', () => {
  let service: PlayScheduleService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PlayScheduleService],
    }).compile();

    service = module.get<PlayScheduleService>(PlayScheduleService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
