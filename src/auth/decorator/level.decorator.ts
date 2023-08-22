import { SetMetadata } from '@nestjs/common';
import { LevelType } from '../../user/level-type';

export const Level = (level: LevelType): any => {
  return SetMetadata('level', level);
};
