import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Audio {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  AudioType: 'local' | 'cloud';

  @Column({
    type: 'longtext',
  })
  path: string;

  @Column()
  duration_ms: number;
}
