import { Injectable } from '@nestjs/common';
import {
  Connection,
  EntitySubscriberInterface,
  EventSubscriber,
  RemoveEvent,
  Repository,
} from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Audio } from 'src/audio/entity/audio.entity';
import Track from '../Track.entity';

@Injectable()
@EventSubscriber()
export class TrackSubscriber implements EntitySubscriberInterface<Track> {
  constructor(
    private connection: Connection,
    @InjectRepository(Audio)
    private readonly audioRepository: Repository<Audio>,
  ) {
    connection.subscribers.push(this);
  }
  listenTo() {
    return Track;
  }

  async beforeRemove(event: RemoveEvent<Track>) {
    if (event.entity?.audio) {
      await this.audioRepository.remove(event.entity?.audio);
    }
  }
}
