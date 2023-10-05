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
export class DayOfWeek extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  day: number;

  @ManyToOne(
    (type) => PlaySchedule,
    (playSchedule) => playSchedule.daysOfWeek,
    {
      onDelete: 'CASCADE',
      orphanedRowAction: 'delete',
    },
  )
  @JoinColumn({
    name: 'playScheduleId',
  })
  playSchedule: PlaySchedule;
}
