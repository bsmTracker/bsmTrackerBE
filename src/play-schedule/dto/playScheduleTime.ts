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
import { TimeType } from '../type/Time.type';
import { ScheduleEnum } from '../entity/playSchedule.entity';
import { IsTime } from './validator/isTime';
import { ValidateDaysOfWeek } from './validator/isValidDaysOfWeekArray';
import { DayOfWeek } from '../entity/dayOfWeek.entity';
import { DateEntity } from '../entity/date.entity';
import { ValidateDateStrList } from './validator/isValidDateStrArray';

export class PlayScheduleTimeDto {
  @IsNotEmpty()
  @IsIn([ScheduleEnum.DAYS_OF_WEEK, ScheduleEnum.EVENT])
  scheduleType: ScheduleEnum;

  @IsNotEmpty()
  @IsTime()
  startTime: TimeType;

  @IsNotEmpty()
  @IsTime()
  endTime: TimeType;

  @ValidateIf((o) => o.scheduleType === ScheduleEnum.EVENT)
  @IsNotEmpty({
    message: '날짜는 하나 이상 선택되어야합니다.',
  })
  @IsArray({
    message: '요일은 배열 형태입니다.',
  })
  @ArrayNotEmpty({
    message: '날짜는 하나 이상 선택되어야합니다.',
  })
  @ArrayUnique({
    message: '요일이 중복되어 보내졌습니다.',
  })
  @ArrayMaxSize(10, {
    message: '날짜는 최대 10개까지 선택하실 수 있습니다 // 정책',
  })
  @ValidateDateStrList()
  dateList: DateEntity[];

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
  daysOfWeek: DayOfWeek[];
}
