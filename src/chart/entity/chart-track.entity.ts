import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Like } from './like.entity';
import { User } from 'src/user/entity/user.entity';
import Playlist from 'src/playlist/entity/playlist.entity';

@Entity()
export class ChartTrack extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  //유튜브 코드, 연동가능하여지도록
  @Column()
  code: string;

  @Column()
  name: string;

  @Column()
  image: string;

  @Column()
  duration_ms: number;

  @Column()
  userId: number;

  @ManyToOne((type) => User, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'userId',
    referencedColumnName: 'id',
  })
  user: User;

  @Column({
    default: 0,
  })
  likeCount: number;

  @ManyToOne((type) => Playlist, (playlist) => playlist.chartTracks, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'playlistId',
    referencedColumnName: 'id',
  })
  playlist: Playlist;

  @OneToMany((type) => Like, (like) => like.chartTrack)
  likes: Like[];

  @CreateDateColumn()
  createdAt: Date;
}
