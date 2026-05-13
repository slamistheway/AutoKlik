export class CreateAdDto {
    user_id!: number;
    category!: string;
    subcategory!: string;
    brand!: string;
    model!: string;
    price!: number;
    mileage!: number;
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