import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AudioService } from 'src/audio/audio.service';
import { promisify } from 'util';
import { Tts } from './entity/tts.entity';
import { Repository } from 'typeorm';
const request = promisify(require('request'));

@Injectable()
export class TtsService {
  constructor(
    private audioService: AudioService,
    @InjectRepository(Tts) private ttsRepository: Repository<Tts>,
  ) {}

  async saveTts(content: string) {
    if (content.length === 0) {
      throw new HttpException(
        '글수를 0자이상 올바르게 입력하세요',
        HttpStatus.CONFLICT,
      );
    }
    const ttsBuffer: Buffer = await this.getTTSBuffer(content);
    const fileName = `${Date.now()}-tts.mp3`;
    const audio = await this.audioService.saveLocalAudio(fileName, ttsBuffer);
    return await this.ttsRepository.save({
      content,
      duration_ms: audio.duration_ms,
      audio: audio,
    });
  }

  async removeTts(id: number) {
    const tts = await this.ttsRepository.findOne({
      where: {
        id,
      },
    });
    if (tts == null) {
      throw new NotFoundException();
    }
    await this.ttsRepository.remove(tts);
  }

  async getTTSBuffer(text: string): Promise<Buffer> {
    const lang = 'ko';
    const speed = '3';
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(
      text,
    )}&tl=${lang}&ttsspeed=${speed}&total=1&idx=0&client=tw-ob&textlen=${
      text.length
    }`;
    try {
      const response = await request({ uri: url, encoding: 'binary' });
      return response.body;
    } catch (e) {
      throw new HttpException('오류발생', HttpStatus.BAD_REQUEST);
    }
  }

  async getTts(ttsId: number) {
    const tts = await this.ttsRepository.findOne({
      where: {
        id: ttsId,
      },
    });
    if (!tts) {
      throw new NotFoundException('tts가 존재하지 않습니다');
    }
    return tts;
  }
}
