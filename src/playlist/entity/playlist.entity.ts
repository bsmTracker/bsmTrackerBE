import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import Track from '../../track/entity/Track.entity';
import { PlaySchedule } from '../../play-schedule/entity/playSchedule.entity';
import { ChartTrack } from 'src/chart/entity/chart-track.entity';

@Entity()
export default class Playlist extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  //재생목록 명 /기상송/등교송/점호송
  @Column()
  name: string;

  @OneToMany((type) => PlaySchedule, (playtime) => playtime.playlist)
  playSchedules: PlaySchedule[];

  @Column({
    default: 0,
  })
  trackCount: number;

  @Column({
    default: 0,
  })
  duration_s: number;

  @OneToMany((type) => Track, (track) => track.playlist)
  tracks: Track[];

  @OneToMany((type) => ChartTrack, (chartTrack) => chartTrack.playlist)
  chartTracks: ChartTrack[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
