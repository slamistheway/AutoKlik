import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get, Logger,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdsService } from './ads.service';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { OptionalSessionAuthGuard } from '../auth/session-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import {AdStatusDto, AdsQueryDto, CreateAdDto, UpdateAdDto} from "../dtos/ad.dtos";
import { SkipThrottle } from '@nestjs/throttler';
import { AdFetchRateLimitGuard } from './ad-fetch-rate-limit.guard';
import { SavedSearchesService } from './saved-searches.service';

const adImageUploadPath = join(process.cwd(), 'public', 'ad-images');


const adImageStorage = diskStorage({
  destination: (_req, _file, cb) => {
    mkdirSync(adImageUploadPath, { recursive: true });
    cb(null, adImageUploadPath);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});




@Controller('ads')
export class AdsController {
  constructor(private readonly adService: AdsService, private readonly savedSearches: SavedSearchesService) {}


  private readonly logger = new Logger(AdsController.name);

  private parsePositiveInt(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private parseNonNegativeInt(
    value: string | undefined,
    fallback: number,
  ): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return fallback;
    }

    return parsed;
  }

  /*-------------------------------------------CREATE---------------------------------------------*/
  /*-------------------------------------------CREATE---------------------------------------------*/
  /*-------------------------------------------CREATE---------------------------------------------*/
  /*-------------------------------------------CREATE---------------------------------------------*/
  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10, { storage: adImageStorage }))
  @Post()
  create(
    @Req() req: any,
    @Body() createAdDto: CreateAdDto,
    @UploadedFiles() files: Express.Multer.File[] = [],
  ) {
    const images = files.map((file) => `ad-images/${file.filename}`);
    this.logger.log(`Creating ad with images: ${images.join(', ')}`);

    const nullableNumber = (value: unknown): number | null => {
      if (value === undefined || value === null || value === '') return null;
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    };
    const nullableInteger = (value: unknown): number | null => {
      const parsed = nullableNumber(value);
      return parsed === null ? null : Math.trunc(parsed);
    };

    return this.adService.create(
      {
        ...createAdDto,
        user_id: Number(req.user?.id),
        year: Number(createAdDto.year),
        price: nullableNumber(createAdDto.price) ?? 0,
        kilometrage: nullableInteger(createAdDto.kilometrage) ?? 0,
        doorNumber: nullableInteger(createAdDto.doorNumber),
        weight: nullableInteger(createAdDto.weight),
        payload: nullableInteger(createAdDto.payload),
        volume: nullableInteger(createAdDto.volume),
        driveType: createAdDto.driveType || null,
        gearCount: nullableInteger(createAdDto.gearCount),
        fuelConsumption: nullableNumber(createAdDto.fuelConsumption),
        warranty: createAdDto.warranty || null,
        gearType: createAdDto.gearType || null,
        color: createAdDto.color || null,
      },
      images,
    );
  }

  @UseGuards(SessionAuthGuard, AdFetchRateLimitGuard)
  @Get('me')
  @SkipThrottle({ default: true, burst: true })
  findMyAds(@Req() req: any) {
    return this.adService.fetchAllAdsByUserId(Number(req.user?.id));
  }

  @UseGuards(SessionAuthGuard, AdFetchRateLimitGuard)
  @Get('me/saved')
  @SkipThrottle({ default: true, burst: true })
  findMySavedAds(@Req() req: any) {
    return this.adService.fetchSavedAds(Number(req.user?.id));
  }

  /*-------------------------------------------READ---------------------------------------------*/
  /*-------------------------------------------READ---------------------------------------------*/
  /*-------------------------------------------READ---------------------------------------------*/
  /*-------------------------------------------READ---------------------------------------------*/
  @UseGuards(SessionAuthGuard)
  @Get('price-drop-notifications')
  getPriceDropNotifications(@Req() req: any) {
    return this.adService.getPriceDropNotifications(Number(req.user?.id));
  }

  @UseGuards(SessionAuthGuard)
  @Patch('price-drop-notifications/:id/read')
  readPriceDropNotification(@Param('id') id: string, @Req() req: any) {
    return this.adService.readPriceDropNotification(+id, Number(req.user?.id));
  }

  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get('all')
  @SkipThrottle({ default: true, burst: true })
  findAllAds(
    @Req() req: any,
    @Query()
    query: AdsQueryDto,
  ) {
    const filters = {
      category: query.category,
      subcategory: query.subcategory,
      fuel: query.fuel,
      brands: query.brands,
      models: query.models,
      yearMin: query.yearMin === undefined ? undefined : String(query.yearMin),
      yearMax: query.yearMax === undefined ? undefined : String(query.yearMax),
      search: query.search,
    };

    return this.adService.findAllAds(req.user?.id, filters);
  }

  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get('search')
  @SkipThrottle({ default: true, burst: true })
  search(@Query() query: Record<string, string>, @Req() req: any) {
    return this.adService.search(query, req.user?.id);
  }

  @UseGuards(SessionAuthGuard)
  @Get('saved-searches')
  listSearches(@Req() req: any) { return this.savedSearches.list(Number(req.user.id)); }

  @UseGuards(SessionAuthGuard)
  @Post('saved-searches')
  saveSearch(@Req() req: any, @Body() body: Record<string, unknown>) { return this.savedSearches.create(Number(req.user.id), body); }

  @UseGuards(SessionAuthGuard)
  @Patch('saved-searches/:id')
  updateSearch(@Req() req: any, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.savedSearches.update(Number(req.user.id), +id, body); }

  @UseGuards(SessionAuthGuard)
  @Delete('saved-searches/:id')
  deleteSearch(@Req() req: any, @Param('id') id: string) { return this.savedSearches.remove(Number(req.user.id), +id); }

  @UseGuards(SessionAuthGuard)
  @Get('search-alerts')
  searchAlerts(@Req() req: any) { return this.savedSearches.alerts(Number(req.user.id)); }

  @UseGuards(SessionAuthGuard)
  @Patch('search-alerts/:id/read')
  readSearchAlert(@Req() req: any, @Param('id') id: string) { return this.savedSearches.readAlert(Number(req.user.id), +id); }

  @Get('sitemap')
  sitemap(@Query() query: Record<string, string>) {
    return this.adService.sitemap(query);
  }

  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get('featured')
  @SkipThrottle({ default: true, burst: true })
  findFeaturedAds(@Req() req: any,) {
    return this.adService.findFeaturedAds(req.user?.id);
  }

  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get('recommended')
  @SkipThrottle({ default: true, burst: true })
  findRecommendedAds(@Req() req: any) {
    return this.adService.findRecommendedAds(req.user?.id);
  }


  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get('recently-viewed')
  @SkipThrottle({ default: true, burst: true })
  findRecentlyViewed(@Query('ids') ids: string) {
    if (typeof ids !== 'string' || !/^\d+(,\d+){0,19}$/.test(ids) || ids.length > 240) {
      throw new BadRequestException('Neispravan popis oglasa.');
    }
    const parsed = [...new Set(ids.split(',').map(Number))];
    if (parsed.some(id => !Number.isSafeInteger(id) || id <= 0)) throw new BadRequestException('Neispravan oglas.');
    return this.adService.findRecentlyViewed(parsed);
  }

  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get('seller/:sellerId')
  @SkipThrottle({ default: true, burst: true })
  findSellerProfile(@Param('sellerId') sellerId: string, @Query('page') page: string | undefined, @Query('status') status: string | undefined, @Req() req: any) {
    return this.adService.findSellerProfile(+sellerId, page === undefined ? 1 : Number(page), status ?? 'all', req.user?.id);
  }

  @UseGuards(SessionAuthGuard)
  @Post(':id/view')
  recordView(@Param('id') id: string, @Req() req: any) {
    return this.adService.recordView(+id, Number(req.user?.id));
  }

  @UseGuards(SessionAuthGuard)
  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() body: AdStatusDto, @Req() req: any) {
    return this.adService.updateStatus(+id, Number(req.user?.id), body.status);
  }

  @UseGuards(OptionalSessionAuthGuard, AdFetchRateLimitGuard)
  @Get(':id')
  @SkipThrottle({ default: true, burst: true })
  findOne(@Param('id') id: string, @Req() req: any) {
    return this.adService.findOne(+id, req.user?.id);
  }

  @UseGuards(SessionAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: adImageStorage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, callback) => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ||
        !['.jpg', '.jpeg', '.png', '.webp'].includes(extname(file.originalname).toLowerCase())) {
        return callback(new BadRequestException('Dozvoljene su JPEG, PNG i WebP slike.'), false);
      }
      callback(null, true);
    },
  }))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdDto: UpdateAdDto, @Req() req: any, @UploadedFiles() files: Express.Multer.File[] = []) {
    return this.adService.update(+id, Number(req.user?.id), updateAdDto, files.map(file => `ad-images/${file.filename}`));
  }

  @UseGuards(SessionAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.adService.deleteAd(+id, Number(req.user?.id));
  }

  /*--------------------------SAVING ADS FOR USERS---------------------------------*/
  @UseGuards(SessionAuthGuard)
  @Post('save/:adId')
  saveAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.saveAd(Number(req.user?.id), +adId);
  }
  @UseGuards(SessionAuthGuard)
  @Delete('save/:adId')
  unsaveAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.unsaveAd(Number(req.user?.id), +adId);
  }
  @UseGuards(SessionAuthGuard, AdFetchRateLimitGuard)
  @Get('saved/:adId')
  @SkipThrottle({ default: true, burst: true })
  checkIfSaved(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.checkIfSaved(Number(req.user?.id), +adId);
  }

  /*-------------------------------------------DELETE---------------------------------------------*/
  /*-------------------------------------------DELETE---------------------------------------------*/
  /*-------------------------------------------DELETE---------------------------------------------*/
  /*-------------------------------------------DELETE---------------------------------------------*/

  /*--------------------------DELETING ADS---------------------------------*/
  @UseGuards(SessionAuthGuard)
  @Delete('delete/:adId')
  deleteAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.deleteAd(+adId, Number(req.user?.id));
  }
}
