import { BaseEntity, Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class Time extends BaseEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  hour: number;
  @Column()
  minute: number;
  @Column()
  second: number;
}
