export class CreateAdDto {
    vin?: string | null;
    user_id!: number;
    category!: string;
    subcategory!: string;
    brand!: string;
    model!: string;
    price!: number;
    kilometrage!: number;
    enginePower?: number | null;
    engineSize?: number | null;
    fuel!: string;
    condition!: string;
    county!: string;
    sellerType!: string;
    buyOrLease!: string;
    driveType?: string | null;
    gearCount?: number | null;
    fuelConsumption?: number | null;
    warranty?: string | null;
    gearType!: string | null;
    color!: string | null;
    doorNumber?: number | null;
    drivingLicence?: string;
    weight?: number | null;
    payload?: number | null;
    volume?: number | null;
    title!: string;
    description!: string;
    year!: number;
}
export class AdsQueryDto {
    fuel?: string;
    category?: string;
    subcategory?: string;
    brands?: string;
    models?: string;
    yearMin?: number;
    yearMax?: number;
    search?: string;
    limit?: number;
    offset?: number;
}

export class UpdateAdDto {
    engineSize?: number | null;
    vin?: string | null;
    retainedImages?: string;
    imageOrder?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    model?: string;
    price?: number;
    kilometrage?: number;
    enginePower?: number | null;
    fuel?: string;
    condition?: string;
    county?: string;
    sellerType?: string;
    buyOrLease?: string;
    driveType?: string | null;
    gearCount?: number | null;
    fuelConsumption?: number | null;
    warranty?: string | null;
    gearType?: string | null;
    color?: string | null;
    doorNumber?: number | null;
    drivingLicence?: string;
    weight?: number | null;
    payload?: number | null;
    volume?: number | null;
    title?: string;
    description?: string;
    year?: number;
}


export class AdStatusDto {
    status: 'active' | 'sold' | 'hidden';
}

