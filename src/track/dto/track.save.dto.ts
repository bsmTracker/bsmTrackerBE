import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class TrackSaveDto {
  @IsNotEmpty()
  @IsNumber()
  playlistId: number;
  @IsNotEmpty()
  @IsString()
  code: string;
}
