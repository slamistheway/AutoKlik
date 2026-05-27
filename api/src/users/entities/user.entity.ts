import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Ad } from '../../ad/entities/ad.entity';
import { SavedAd } from '../../ad/entities/saved-ad.entity';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn({ name: 'id' })
  id!: number;

  @Column({ name: 'username', type: 'text', unique: true })
  username!: string;

  @Column({ name: 'email', type: 'text', unique: true })
  email!: string;

  @Column({ name: 'password', type: 'text' })
  password!: string;

  @Column({ name: 'pfp', type: 'text', nullable: true })
  pfp!: string | null;

  @Column({ name: 'first_name', type: 'text', nullable: true })
  firstName!: string | null;

  @Column({ name: 'last_name', type: 'text', nullable: true })
  lastName!: string | null;

  @Column({ name: 'phone', type: 'text', nullable: true })
  phone!: string | null;

  @Column({ name: 'city', type: 'text', nullable: true })
  city!: string | null;

  @Column({ name: 'country', type: 'text', nullable: true })
  country!: string | null;

  @OneToMany(() => Ad, (ad) => ad.user)
  ads!: Ad[];

  @OneToMany(() => SavedAd, (savedAd) => savedAd.user)
  savedAds!: SavedAd[];
}


