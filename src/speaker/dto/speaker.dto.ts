import { IsNotEmpty, Max, Min } from 'class-validator';

export class VolumeDto {
  @IsNotEmpty()
  @Min(0)
  @Max(100)
  volume: number;
}
