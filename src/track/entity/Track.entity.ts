import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import Playlist from '../../playlist/entity/playlist.entity';
import { Audio } from 'src/audio/entity/audio.entity';

@Entity()
export default class Track extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;
  //어디 플레이리스트에
  @Column()
  playlistId: number;
  //어떤 노래
  @Column()
  code: string;

  @ManyToOne((type) => Playlist, (playlist) => playlist.tracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'playlistId',
    referencedColumnName: 'id',
  })
  playlist: Playlist;

  @Column({
    nullable: false,
  })
  order: number;

  @Column()
  name: string;

  @Column()
  image: string;

  @Column()
  duration_ms: number;

  @Column({
    nullable: true,
    unique: true,
  })
  audioId: number;

  @OneToOne(() => Audio, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'audioId',
    referencedColumnName: 'id',
  })
  audio: Audio;

  @Column({
    type: 'datetime',
  })
  playUriExpire: Date;
}
