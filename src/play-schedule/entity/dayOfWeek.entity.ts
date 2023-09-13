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

  @Column({
    nullable: true,
  })
  playScheduleId: number;

  @ManyToOne(
    (type) => PlaySchedule,
    (playSchedule) => playSchedule.daysOfWeek,
    {
      onDelete: 'CASCADE',
    },
  )
  @JoinColumn({
    name: 'playScheduleId',
  })
  playSchedule: PlaySchedule;

  @Column()
  day: number;
}
