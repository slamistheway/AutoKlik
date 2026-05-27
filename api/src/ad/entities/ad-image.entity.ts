import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ad } from './ad.entity';

@Entity({ name: 'ad_images' })
export class AdImage {
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @Column({ name: 'ad_id', type: 'int' })
  adId!: number;

  @ManyToOne(() => Ad, (ad) => ad.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ad_id' })
  ad!: Ad;

  @Column({ name: 'image_url', type: 'text' })
  imageUrl!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;
}


