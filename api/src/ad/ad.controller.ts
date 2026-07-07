import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors
} from '@nestjs/common';
import { AdService } from './ad.service';
import { CreateAdDto } from './dto/create-ad.dto';
import { UpdateAdDto } from './dto/update-ad.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { extname, join } from 'path';

const adImageUploadPath = join(__dirname, '..', '..', 'public', 'ad-images');

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

@Controller('ad')
export class AdController {
  constructor(private readonly adService: AdService) {}

  private parsePositiveInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return fallback;
    }

    return parsed;
  }

  private parseNonNegativeInt(value: string | undefined, fallback: number): number {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed < 0) {
      return fallback;
    }

    return parsed;
  }


  /*-------------------------------------------CREATE---------------------------------------------*/
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FilesInterceptor('images', 10, { storage: adImageStorage }))
  @Post()
  create(@Body() createAdDto: CreateAdDto, @UploadedFiles() files: Express.Multer.File[] = []) {
    const images = files.map((file) => `ad-images/${file.filename}`);

    return this.adService.create({
      ...createAdDto,
      user_id: Number(createAdDto.user_id),
      year: Number(createAdDto.year),
    }, images);
  }




  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyAds(@Req() req: any) {
    return this.adService.fetchAllAdsByUserId(Number(req.user?.id));
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/saved')
  findMySavedAds(@Req() req: any) {
    return this.adService.fetchSavedAds(Number(req.user?.id));
  }

  /*-------------------------------------------SELECTING---------------------------------------------*/
  /*-------------------------------------------SELECTING---------------------------------------------*/
  /*-------------------------------------------SELECTING---------------------------------------------*/
  /*-------------------------------------------SELECTING---------------------------------------------*/
  @UseGuards(OptionalJwtAuthGuard)
  @Get('all')
  findAllAds(
      @Req() req: any,
      @Query() query: {
        category?: string;
        subcategory?: string;
        brands?: string;
        models?: string;
        yearMin?: string;
        yearMax?: string;
        search?: string;
        limit?: string;
        offset?: string;
      },
  ) {
    const filters = {
      category: query.category,
      subcategory: query.subcategory,
      brands: query.brands,
      models: query.models,
      yearMin: query.yearMin,
      yearMax: query.yearMax,
      search: query.search,
    };

    return this.adService.findAllAds(req.user?.id, filters);
  }


  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.adService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAdDto: UpdateAdDto) {
    return this.adService.update(+id, updateAdDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.adService.remove(+id);
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
  @UseGuards(JwtAuthGuard)
  @Get('saved/:adId')
  checkIfSaved(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.checkIfSaved(Number(req.user?.id), +adId);
  }


  /*--------------------------CRUD---------------------------------*/
  /*DELETE AD*/
  @UseGuards(JwtAuthGuard)
  @Delete('delete/:adId')
  deleteAd(@Param('adId') adId: string, @Req() req: any) {
    return this.adService.deleteAd(+adId, Number(req.user?.id));
  }


}
