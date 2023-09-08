import { IsNotEmpty, Max, Min, MinLength } from 'class-validator';

export class BroadcastDetailDto {
  @IsNotEmpty()
  @MinLength(5)
  content: string;

  @IsNotEmpty()
  @Min(0)
  @Max(100)
  volume: number;
}
