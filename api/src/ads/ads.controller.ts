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
import { JwtAuthGuard } from '../users/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../users/guards/optional-jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';
import {AdsQueryDto, CreateAdDto, UpdateAdDto} from "../dtos/ad.dtos";
import { SkipThrottle } from '@nestjs/throttler';
import { AdFetchRateLimitGuard } from './ad-fetch-rate-limit.guard';

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
  constructor(private readonly adService: AdsService) {}


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
  @UseGuards(JwtAuthGuard)
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
        gearType: createAdDto.gearType || null,
        color: createAdDto.color || null,
      },
      images,
    );
  }

  @UseGuards(JwtAuthGuard, AdFetchRateLimitGuard)
  @Get('me')
  @SkipThrottle({ default: true, burst: true })
  findMyAds(@Req() req: any) {
    return this.adService.fetchAllAdsByUserId(Number(req.user?.id));
  }

  @UseGuards(JwtAuthGuard, AdFetchRateLimitGuard)
  @Get('me/saved')
  @SkipThrottle({ default: true, burst: true })
  findMySavedAds(@Req() req: any) {
    return this.adService.fetchSavedAds(Number(req.user?.id));
  }

  /*-------------------------------------------READ---------------------------------------------*/
  /*-------------------------------------------READ---------------------------------------------*/
  /*-------------------------------------------READ---------------------------------------------*/
  /*-------------------------------------------READ---------------------------------------------*/
  @UseGuards(OptionalJwtAuthGuard, AdFetchRateLimitGuard)
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
      brands: query.brands,
      models: query.models,
      yearMin: query.yearMin === undefined ? undefined : String(query.yearMin),
      yearMax: query.yearMax === undefined ? undefined : String(query.yearMax),
      search: query.search,
    };

    return this.adService.findAllAds(req.user?.id, filters);
  }

  @UseGuards(OptionalJwtAuthGuard, AdFetchRateLimitGuard)
  @Get('featured')
  @SkipThrottle({ default: true, burst: true })
  findFeaturedAds(@Req() req: any,) {
    return this.adService.findFeaturedAds(req.user?.id);
  }


  @UseGuards(OptionalJwtAuthGuard, AdFetchRateLimitGuard)
  @Get(':id')
  @SkipThrottle({ default: true, burst: true })
  findOne(@Param('id') id: string) {
    return this.adService.findOne(+id);
  }

  @UseGuards(JwtAuthGuard)
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

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: any) {
    return this.adService.deleteAd(+id, Number(req.user?.id));
  }

  /*--------------------------SAVING ADS FOR USERS---------------------------------*/
  @UseGuards(JwtAuthGuard)
  @Post('save/:adId')
  saveAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.saveAd(Number(req.user?.id), +adId);
  }
  @UseGuards(JwtAuthGuard)
  @Delete('save/:adId')
  unsaveAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.unsaveAd(Number(req.user?.id), +adId);
  }
  @UseGuards(JwtAuthGuard, AdFetchRateLimitGuard)
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
  @UseGuards(JwtAuthGuard)
  @Delete('delete/:adId')
  deleteAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.deleteAd(+adId, Number(req.user?.id));
  }
}
