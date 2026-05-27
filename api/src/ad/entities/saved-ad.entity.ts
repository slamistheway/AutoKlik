import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Ad } from './ad.entity';

@Entity({ name: 'saved_ads' })
export class SavedAd {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @PrimaryColumn({ name: 'ad_id', type: 'int' })
  adId!: number;

  @ManyToOne(() => User, (user) => user.savedAds, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @ManyToOne(() => Ad, (ad) => ad.savedBy, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ad_id' })
  ad!: Ad;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}


