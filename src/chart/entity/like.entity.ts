import { User } from 'src/user/entity/user.entity';
import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ChartTrack } from './chart-track.entity';

@Entity()
export class Like extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  likerId: number;

  @Column()
  chartTrackId: number;

  @ManyToOne((type) => User)
  @JoinColumn({
    name: 'likerId',
    referencedColumnName: 'id',
  })
  liker: User;

  @ManyToOne((type) => ChartTrack, (chartTrack) => chartTrack.likes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({
    name: 'chartTrackId',
    referencedColumnName: 'id',
  })
  chartTrack: ChartTrack;
}
