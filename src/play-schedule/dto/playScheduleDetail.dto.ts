import { IsNotEmpty, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PlayScheduleTimeDto } from './playScheduleTime';

export class PlayScheduleDetailDto extends PlayScheduleTimeDto {
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsNumber()
  //음악 플레이리스트 재생전, 재생할 멜로디 파일 이름
  startMelodyId?: number;

  @IsOptional()
  @IsNumber()
  ttsId?: number;

  //재생할 음악 플레이리스트
  @IsOptional()
  @IsNumber()
  playlistId?: number;

  @IsNotEmpty()
  @Min(0)
  @Max(100)
  volume: number;
}
