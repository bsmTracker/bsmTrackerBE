import { Module } from '@nestjs/common';
import { AudioController } from './audio.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Audio } from './entity/audio.entity';
import { AudioService } from './audio.service';
import { AudioSubscriber } from './entity/subscriber/audio.subscriber';
import { AuthModule } from 'src/auth/auth.module';
import { AuthGuard } from 'src/auth/guards/auth.guard';
@Module({
  imports: [TypeOrmModule.forFeature([Audio])],
  controllers: [AudioController],
  providers: [AudioService, AudioSubscriber],
  exports: [TypeOrmModule, AudioService],
})
export class AudioModule {}
