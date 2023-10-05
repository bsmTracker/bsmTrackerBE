import { Audio } from 'src/audio/entity/audio.entity';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
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

  @OneToOne((type) => Audio, {
    eager: true,
    cascade: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({
    name: 'audioId',
    referencedColumnName: 'id',
  })
  audio: Audio;
}
