import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsIn,
  IsNotEmpty,
  ValidateIf,
} from 'class-validator';
import { Time } from '../type/Time.type';
import { ScheduleEnum } from '../entity/playSchedule.entity';
import { IsTime } from './validator/isTime';
import { ValidateDaysOfWeek } from './validator/isValidDaysOfWeekArray';
import { DaysOfWeek } from '../entity/daysOfWeek.entity';

export class PlayScheduleTimeDto {
  @IsNotEmpty()
  @IsIn([ScheduleEnum.DAYS_OF_WEEK, ScheduleEnum.EVENT])
  scheduleType: ScheduleEnum;

  @IsNotEmpty()
  @IsTime()
  startTime: Time;

  @IsNotEmpty()
  @IsTime()
  endTime: Time;

  @ValidateIf((o) => o.scheduleType === ScheduleEnum.EVENT)
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ValidateIf((o) => o.scheduleType === ScheduleEnum.EVENT)
  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  @ValidateIf((o) => o.scheduleType === ScheduleEnum.DAYS_OF_WEEK)
  @IsNotEmpty({
    message: '요일은 하나 이상 선택되어야합니다.',
  })
  @IsArray({
    message: '요일은 배열 형태입니다.',
  })
  @ArrayNotEmpty({
    message: '요일은 하나 이상 선택되어야합니다.',
  })
  @ArrayUnique({
    message: '요일이 중복되어 보내졌습니다.',
  })
  @ArrayMaxSize(7, {
    message: '요일은 일~월으로 7까지가 최대입니다',
  })
  @ValidateDaysOfWeek()
  daysOfWeek: DaysOfWeek[];
}
