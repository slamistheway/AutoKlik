import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdService } from './ad.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Ad } from '../entities/ad.entity';
import { AdImage } from '../entities/ad-image.entity';
import { SavedAd } from '../entities/saved-ad.entity';

describe('AdService', () => {
  let service: AdService;

  const adsRepoMock = {
    find: jest.fn(),
    findOne: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const adImagesRepoMock = {
    insert: jest.fn(),
    delete: jest.fn(),
  };

  const savedAdsRepoMock = {
    insert: jest.fn(),
    delete: jest.fn(),
    exist: jest.fn(),
    find: jest.fn(),
  };

  const dataSourceMock = {
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdService,
        { provide: getRepositoryToken(Ad), useValue: adsRepoMock },
        { provide: getRepositoryToken(AdImage), useValue: adImagesRepoMock },
        { provide: getRepositoryToken(SavedAd), useValue: savedAdsRepoMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<AdService>(AdService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when the user id is invalid for user-scoped lookup', async () => {
    await expect(service.fetchAllAdsByUserId(0)).rejects.toThrow(BadRequestException);
  });
});
