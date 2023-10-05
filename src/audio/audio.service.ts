import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Audio } from './entity/audio.entity';
import { ROOT_PATH } from 'src/main';
import * as path from 'path';
import * as fs from 'fs';
import getAudioDurationInSeconds from 'get-audio-duration';

@Injectable()
export class AudioService {
  constructor(
    @InjectRepository(Audio) private audioRepository: Repository<Audio>,
  ) {}

  async removeAudio(id: number) {
    const audio = await this.audioRepository.findOne({
      where: {
        id,
      },
    });
    if (!audio) {
      throw new NotFoundException();
    }
    await this.audioRepository.remove(audio);
  }

  async saveLocalAudio(fileName: string, buffer: Buffer) {
    const filePath = `/uploads/audio/${fileName}`;
    fs.writeFileSync(path.join(ROOT_PATH, filePath), buffer, 'binary');
    const duration = await getAudioDurationInSeconds(
      path.join(ROOT_PATH, filePath),
    );
    const duration_ms = Math.round(duration * 1000);
    return await this.audioRepository.save({
      AudioType: 'local',
      duration_ms,
      path: filePath,
    });
  }

  async saveCloudAudio(externalPath: string, duration_ms: number) {
    return await this.audioRepository.save({
      AudioType: 'cloud',
      duration_ms,
      path: externalPath,
    });
  }

  async getAudio(audioId: number) {
    return await this.audioRepository.findOne({
      where: {
        id: audioId,
      },
    });
  }
}
