import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getDescription(): string {
    return `This Server Is Working`;
  }
}
