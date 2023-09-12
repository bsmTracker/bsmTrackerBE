import { Time } from 'src/play-schedule/type/Time.type';

export class TimeUtil {
  static isOverlappingTime(
    aStartTime: Time,
    bStartTime: Time,
    aEndTime: Time,
    bEndTime: Time,
  ) {
    const aStartTimeSize = TimeUtil.getTimeSize_s(aStartTime);
    const bStartTimeSize = TimeUtil.getTimeSize_s(bStartTime);

    const aEndTimeSize = TimeUtil.getTimeSize_s(aEndTime);
    const bEndTimeSize = TimeUtil.getTimeSize_s(bEndTime);

    if (aStartTimeSize >= aEndTimeSize) {
      if (bStartTimeSize >= bEndTimeSize) {
        //안돼임마
        return true;
      }
      if (bStartTimeSize <= bEndTimeSize) {
        if (bEndTimeSize >= aStartTimeSize) {
          //안돼임마
          return true;
        }

        if (bStartTimeSize <= aEndTimeSize) {
          //안돼임마
          return true;
        }
      }
    }
    if (aStartTimeSize <= aEndTimeSize) {
      if (bStartTimeSize <= bEndTimeSize) {
        if (
          bStartTimeSize >= aStartTimeSize &&
          bStartTimeSize <= aEndTimeSize
        ) {
          return true;
        }
        if (bEndTimeSize >= aStartTimeSize && bEndTimeSize <= aEndTimeSize) {
          return true;
          //안돼 임마
        }
      }
      if (bStartTimeSize >= bEndTimeSize) {
        if (bStartTimeSize <= aEndTimeSize) {
          return true;
          //안돼 임마
        }
        if (bEndTimeSize >= aStartTimeSize) {
          return true;
          //안돼 임마
        }
      }
    }
    return false;
  }

  static getSchedulerTimeString(time: Time): string {
    return `${time.second} ${time.minute} ${time.hour} * * *`;
  }

  static getTodayStr(): string {
    const date = new Date();
    let offset = date.getTimezoneOffset() * 60000; //ms단위라 60000곱해줌
    let dateOffset = new Date(date.getTime() - offset).toISOString();
    return dateOffset.substring(0, 10);
  }

  static getTimeSize_s(time: Time): number {
    return time.hour * 3600 + time.minute * 60 + time.second;
  }

  static parseTime(timeSize: number) {
    const hour = Math.floor(timeSize / 3600);
    const minute = Math.floor((timeSize % 3600) / 60);
    const second = timeSize % 60;
    return { hour, minute, second };
  }

  static getNowTime(): Time {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
      second: now.getSeconds(),
    };
  }

  static calcTime(time: Time, calcSign: '+' | '-', calcTime: Time): Time {
    let { hour, minute, second } = time;
    hour += 24; // 시간 + 24시간
    second = second + minute * 60 + hour * 60 * 60; // 시간을 전부 초으로 변환
    if (calcSign === '-') {
      second -=
        calcTime.hour * 60 * 60 + calcTime.minute * 60 + calcTime.second;
    }
    if (calcSign === '+') {
      second +=
        calcTime.hour * 60 * 60 + calcTime.minute * 60 + calcTime.second;
    }
    hour = second / 3600;
    hour = Math.floor(hour % 24); // 시간이 24시간을 넘을 수 있으니 %24
    minute = second / 60;
    minute = Math.floor(minute % 60); // 분이 60을 넘을 수 있으니 %60
    second = second % 60; //초가 60을 넘을 수 있으니 % 60
    return {
      hour,
      minute,
      second,
    };
  }
}
