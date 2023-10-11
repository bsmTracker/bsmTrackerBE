import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { LevelType } from '../level-type';
import { ChartTrack } from 'src/chart/entity/chart-track.entity';

@Entity()
export class User extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    nullable: false,
  })
  name: string;

  @Column({
    nullable: true,
  })
  password: string;

  @Column({
    nullable: false,
    unique: true,
  })
  email: string;

  @Column({
    type: 'enum',
    enum: LevelType,
    default: LevelType.STUDENT,
  })
  level: LevelType;

  @CreateDateColumn()
  createdAt: Date;
}
