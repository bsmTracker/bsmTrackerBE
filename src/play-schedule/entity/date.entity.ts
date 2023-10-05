import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PlaySchedule } from './playSchedule.entity';

@Entity()
export class DateEntity extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  date: string;

  @ManyToOne((type) => PlaySchedule, (playSchedule) => playSchedule.dateList, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'playScheduleId',
  })
  playSchedule: PlaySchedule;
}
