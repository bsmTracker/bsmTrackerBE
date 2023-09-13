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

  @Column({
    nullable: true,
  })
  playlistId: number;

  @Column({
    unique: true,
    nullable: true,
  })
  startMelodyId: number;

  @Column({
    unique: true,
    nullable: true,
  })
  ttsId: number;

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

  // 일회성 재생용 날짜 /해커톤 진행 날짜등 - 요일 보다 우선순위 높음
  // @Column({
  //   nullable: true,
  // })
  // startDate: string;

  // @Column({
  //   nullable: true,
  // })
  // endDate: string;
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

  //재생시작 시분초
  @OneToOne((type) => Time, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  startTime: Time;

  //재생끝 시분초
  @OneToOne((type) => Time, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn()
  endTime: Time;

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
