import { Injectable } from '@nestjs/common';
import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  Repository,
} from 'typeorm';
import { Audio } from 'src/audio/entity/audio.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Tts } from '../tts.entity';

@Injectable()
@EventSubscriber()
export class TtsSubscriber implements EntitySubscriberInterface<Tts> {
  constructor(
    private connection: Connection,
    @InjectRepository(Tts)
    private readonly ttsRepository: Repository<Tts>,
    @InjectRepository(Audio)
    private readonly audioRepository: Repository<Audio>,
  ) {
    connection.subscribers.push(this);
  }
  listenTo() {
    return Tts;
  }

  async beforeRemove(event: RemoveEvent<Tts>) {
    if (event.entity?.audio) {
      await this.audioRepository.remove(event.entity.audio);
    }
  }
}
