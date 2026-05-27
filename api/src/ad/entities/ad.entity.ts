import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { AdImage } from './ad-image.entity';
import { SavedAd } from './saved-ad.entity';

@Entity({ name: 'ads' })
export class Ad {
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne(() => User, (user) => user.ads, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @Column({ name: 'category', type: 'text' })
  category!: string;

  @Column({ name: 'subcategory', type: 'text' })
  subcategory!: string;

  @Column({ name: 'brand', type: 'text' })
  brand!: string;

  @Column({ name: 'model', type: 'text' })
  model!: string;

  @Column({ name: 'title', type: 'text', nullable: true })
  title!: string | null;

  @Column({ name: 'description', type: 'text', nullable: true })
  description!: string | null;

  @Column({ name: 'year', type: 'int', nullable: true })
  year!: number | null;

  @OneToMany(() => AdImage, (image) => image.ad, { cascade: true })
  images!: AdImage[];

  @OneToMany(() => SavedAd, (saved) => saved.ad)
  savedBy!: SavedAd[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  updatedAt!: Date;
}


