import { Injectable } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ScheduleService {
  constructor(private schedulerRegistry: SchedulerRegistry) {}

  addCronJob(name: string, time: string, func: any): any {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      return '이미 추가됨';
    }
    const job = new CronJob(time, func);
    console.log(`${name}이 ${time}에 실행됩니다`);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  // 만약 해당하는 이름의 스케쥴이 있으면 삭제합니다, 없다면 삭제 하지 않고 에러도 발생시키지 않습니다. //
  deleteCronJob(name: string): void {
    if (this.getCronJob(name)) {
      console.log(`${name}이 삭제되었습니다`);
      this.schedulerRegistry.deleteCronJob(name);
    }
  }
  getCronJob(name: string): any {
    if (this.schedulerRegistry.doesExist('cron', name)) {
      return this.schedulerRegistry.getCronJob(name);
    }
    return null;
  }

  async addDateTimeJob(datetime: Date, name: string, func: any) {
    if (datetime < new Date()) {
      console.log('이미 끝난 시간입니다 ', datetime);
      return;
    }
    if (this.schedulerRegistry.doesExist('cron', name)) {
      return '이미 추가됨';
    }
    const job = new CronJob(datetime, func);
    console.log(`${name}이 ${datetime}에 실행됩니다`);
    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }
}
