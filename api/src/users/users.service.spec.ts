import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { User } from './entities/user.entity';
import { Ad } from '../ad/entities/ad.entity';
import { AdImage } from '../ad/entities/ad-image.entity';
import { SavedAd } from '../ad/entities/saved-ad.entity';

describe('UsersService', () => {
  let service: UsersService;

  const repoMock = {
    findOne: jest.fn(),
    save: jest.fn(),
    delete: jest.fn(),
    find: jest.fn(),
  };

  const dataSourceMock = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repoMock },
        { provide: getRepositoryToken(Ad), useValue: repoMock },
        { provide: getRepositoryToken(AdImage), useValue: repoMock },
        { provide: getRepositoryToken(SavedAd), useValue: repoMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
