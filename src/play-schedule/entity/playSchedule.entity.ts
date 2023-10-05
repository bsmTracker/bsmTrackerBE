import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import Playlist from '../../playlist/entity/playlist.entity';
import { Audio } from 'src/audio/entity/audio.entity';
import { Tts } from 'src/tts/entity/tts.entity';
import { DayOfWeek } from './dayOfWeek.entity';
import { Time } from './time.entity';
import { DateEntity } from './date.entity';

export enum ScheduleEnum {
  'EVENT' = 1,
  'DAYS_OF_WEEK' = 2,
}

@Entity()
export class PlaySchedule extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    type: 'enum',
    enum: ScheduleEnum,
  })
  scheduleType: ScheduleEnum;

  @ManyToOne((type) => Playlist, (playlist) => playlist.playSchedules, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'playlistId',
    referencedColumnName: 'id',
  })
  playlist: Playlist;

  @OneToOne((type) => Audio, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'startMelodyId',
    referencedColumnName: 'id',
  })
  startMelody: Audio;

  @OneToOne((type) => Tts, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'ttsId',
    referencedColumnName: 'id',
  })
  tts: Tts;

  //재생시작 시분초
  @OneToOne((type) => Time, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'startTimeId',
    referencedColumnName: 'id',
  })
  startTime: Time;

  //재생종료 시분초
  @OneToOne((type) => Time, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'endTimeId',
    referencedColumnName: 'id',
  })
  endTime: Time;

  @OneToMany(() => DateEntity, (d) => d.playSchedule, {
    eager: true,
    cascade: true,
  })
  dateList: DateEntity[];

  @OneToMany(() => DayOfWeek, (d) => d.playSchedule, {
    eager: true,
    cascade: true,
  })
  daysOfWeek: DayOfWeek[];

  @Column()
  volume: number;

  @Column({
    default: false,
  })
  active: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
