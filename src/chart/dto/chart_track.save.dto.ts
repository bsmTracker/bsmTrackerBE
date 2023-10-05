import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class ChartTrackSaveDto {
  @IsNotEmpty()
  @IsNumber()
  playlistId: number;
  @IsNotEmpty()
  @IsString()
  code: string;
}
