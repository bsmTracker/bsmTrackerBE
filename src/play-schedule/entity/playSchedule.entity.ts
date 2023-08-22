import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import Playlist from '../../playlist/entity/playlist.entity';
import { Audio } from 'src/audio/entity/audio.entity';
import { Time } from '../type/Time.type';
import { Tts } from 'src/tts/entity/tts.entity';

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
  @Column({
    nullable: true,
  })
  startDate: string;

  @Column({
    nullable: true,
  })
  endDate: string;

  //재생 요일 - 일회성 재생용 날짜 보다 우선순위 낮음
  @Column({ type: 'json', nullable: true })
  daysOfWeek: number[];

  //재생시작 시분초
  @Column({
    type: 'json',
  })
  startTime: Time;

  //재생끝 시분초
  @Column({
    type: 'json',
  })
  endTime: Time;

  /** DB 쿼리용 */
  @Column()
  /** 초단위 */
  startTimeSize: number;
  /** 초단위 */
  @Column()
  endTimeSize: number;
  /** DB 쿼리용 */

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
