import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { AdService } from './ad.service';

describe('AdService', () => {
  let service: AdService;

  const poolMock = {
    query: jest.fn(),
    connect: jest.fn(),
  };

  const clientMock = {
    query: jest.fn(),
    release: jest.fn(),
  };

  beforeEach(async () => {
    poolMock.connect.mockResolvedValue(clientMock);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdService,
        { provide: 'DATABASE_POOL', useValue: poolMock },
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

  it('returns ads for a specific user', async () => {
    poolMock.query.mockResolvedValue({ rows: [{ id: 1, user_id: 7, images: [] }] });

    await expect(service.fetchAllAdsByUserId(7)).resolves.toEqual([{ id: 1, user_id: 7, images: [] }]);
    expect(poolMock.query).toHaveBeenCalledWith(expect.stringContaining('WHERE ads.user_id = $1'), [7]);
  });

  it('stores image records when creating an ad', async () => {
    const insertAdsFragment = ['INSERT', 'INTO', 'ads'].join(' ');
    const insertImagesFragment = ['INSERT', 'INTO', 'ad_images'].join(' ');

    clientMock.query
      .mockResolvedValueOnce({ rows: [{ id: 1, user_id: 7, category: 'car', subcategory: 'personal_car', brand: 'BMW', model: '3 Series', title: 'Test ad', description: 'Test description', year: 2024, created_at: new Date(), updated_at: new Date() }] })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await expect(
      (service as any).create({
        user_id: 7,
        category: 'car',
        subcategory: 'personal_car',
        brand: 'BMW',
        model: '3 Series',
        title: 'Test ad',
        description: 'Test description',
        year: 2024,
      }, ['ad-images/test.jpg']),
    ).resolves.toEqual({
      message: 'Ad created successfully.',
      ad: {
        id: 1,
        user_id: 7,
        category: 'car',
        subcategory: 'personal_car',
        brand: 'BMW',
        model: '3 Series',
        title: 'Test ad',
        description: 'Test description',
        year: 2024,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
        images: ['ad-images/test.jpg'],
      },
    });

    expect(poolMock.connect).toHaveBeenCalled();
    expect(clientMock.query).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(clientMock.query.mock.calls[1][0]).toContain(insertAdsFragment);
    expect(clientMock.query).toHaveBeenNthCalledWith(2, expect.any(String), [7, 'car', 'personal_car', 'BMW', '3 Series', 'Test ad', 'Test description', 2024]);
    expect(clientMock.query.mock.calls[2][0]).toContain(insertImagesFragment);
    expect(clientMock.query).toHaveBeenNthCalledWith(3, expect.any(String), [1, 'ad-images/test.jpg']);
    expect(clientMock.query).toHaveBeenNthCalledWith(4, 'COMMIT');
  });
});
