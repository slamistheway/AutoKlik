export class CreateAdDto {
    user_id!: number;
    category!: string;
    subcategory!: string;
    brand!: string;
    model!: string;
    price!: number;
    kilometrage!: number;
    enginePower?: number | null;
    fuel!: string;
    condition!: string;
    county!: string;
    sellerType!: string;
    buyOrLease!: string;
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


