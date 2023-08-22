import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BaseEntity,
  OneToMany,
  CreateDateColumn,
} from 'typeorm';
import { User } from 'src/user/entity/user.entity';

@Entity()
export class Token extends BaseEntity {
  @PrimaryColumn({
    length: 300,
  })
  token: string;

  @Column({
    default: true,
  })
  valid: boolean;

  @Column({
    nullable: false,
  })
  userId: number;

  @ManyToOne((type) => User, (user) => user.refereshTokens, {
    onDelete: 'CASCADE',
    eager: true,
  })
  @JoinColumn({
    name: 'userId',
  })
  user: User;

  @CreateDateColumn()
  createdAt: Date;
}
