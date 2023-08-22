import { Audio } from 'src/audio/entity/audio.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity()
export class Tts {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  content: string;

  @Column()
  duration_ms: number;

  @Column({
    unique: true,
    nullable: true,
  })
  audioId: number;

  @OneToOne((type) => Audio, {
    eager: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'audioId',
    referencedColumnName: 'id',
  })
  audio: Audio;
}
