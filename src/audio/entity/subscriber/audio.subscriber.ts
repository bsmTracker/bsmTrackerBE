import { Injectable } from '@nestjs/common';
import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  Repository,
} from 'typeorm';
import { Audio } from '../audio.entity';
import * as path from 'path';
import * as fs from 'fs';
import { ROOT_PATH } from 'src/main';

@Injectable()
@EventSubscriber()
export class AudioSubscriber implements EntitySubscriberInterface<Audio> {
  constructor(private connection: Connection) {
    connection.subscribers.push(this);
  }
  listenTo() {
    return Audio;
  }

  async beforeRemove(event: RemoveEvent<Audio>) {
    const audio = event.entity;
    console.log('오디오제거됨');
    if (audio?.AudioType === 'local') {
      console.log(audio.path);
      const isExsist = fs.existsSync(path.join(ROOT_PATH, audio.path));
      if (isExsist) {
        fs.unlinkSync(path.join(ROOT_PATH, audio.path));
      }
    }
  }
}
