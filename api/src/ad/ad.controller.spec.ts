import { Test, TestingModule } from '@nestjs/testing';
import { AdController } from './ad.controller';
import { AdService } from './ad.service';

describe('AdController', () => {
  let controller: AdController;

  const adServiceMock = {
    create: jest.fn(),
    findAllAdsHomePage: jest.fn(),
    fetchAllAdsByUserId: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdController],
      providers: [
        { provide: AdService, useValue: adServiceMock },
      ],
    }).compile();

    controller = module.get<AdController>(AdController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('returns only ads for the authenticated user', async () => {
    adServiceMock.fetchAllAdsByUserId.mockResolvedValue([{ id: 1 }]);

    await expect(controller.findMyAds({ user: { id: 42 } } as any)).resolves.toEqual([{ id: 1 }]);
    expect(adServiceMock.fetchAllAdsByUserId).toHaveBeenCalledWith(42);
  });

  it('passes authenticated user id to findAllAdsHomePage', async () => {
    adServiceMock.findAllAdsHomePage.mockResolvedValue([{ id: 1, is_saved: true }]);

    await expect((controller as any).findAllAdsHomePage({ user: { id: 42 } })).resolves.toEqual([{ id: 1, is_saved: true }]);
    expect(adServiceMock.findAllAdsHomePage).toHaveBeenCalledWith(42);
  });

  it('passes undefined user id to findAllAdsHomePage for anonymous requests', async () => {
    adServiceMock.findAllAdsHomePage.mockResolvedValue([{ id: 1, is_saved: false }]);

    await expect((controller as any).findAllAdsHomePage({})).resolves.toEqual([{ id: 1, is_saved: false }]);
    expect(adServiceMock.findAllAdsHomePage).toHaveBeenCalledWith(undefined);
  });
});
