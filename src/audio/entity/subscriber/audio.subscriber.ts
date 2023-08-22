import { Injectable } from '@nestjs/common';
import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  Repository,
} from 'typeorm';
import { Audio } from '../audio.entity';
import { AudioService } from 'src/audio/audio.service';
import * as path from 'path';
import * as fs from 'fs';
import { ROOT_PATH } from 'src/main';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
@EventSubscriber()
export class AudioSubscriber implements EntitySubscriberInterface<Audio> {
  constructor(
    private connection: Connection,
    private readonly audioService: AudioService,
    @InjectRepository(Audio)
    private readonly audioRepository: Repository<Audio>,
  ) {
    connection.subscribers.push(this); // <---- THIS
  }
  listenTo() {
    return Audio;
  }

  async beforeRemove(event: RemoveEvent<Audio>) {
    const audio = await this.audioRepository.findOne({
      where: {
        id: event.entity.id,
      },
    });
    if (!audio) return;
    if (audio.AudioType === 'local') {
      console.log(audio.path);
      const isExsist = fs.existsSync(path.join(ROOT_PATH, audio.path));
      if (isExsist) {
        fs.unlinkSync(path.join(ROOT_PATH, audio.path));
      }
    }
  }
}
