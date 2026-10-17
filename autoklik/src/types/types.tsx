export type CurrentUser = {
    id: number | string;
    username: string;
    email: string;
    pfp?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    city?: string | null;
    country?: string | null;
};


export type AdCardData = {
    id: number;
    viewCount?: number;
    status?: 'active' | 'sold' | 'hidden' | 'expired';
    expiresAt?: string | null;
    userId: number;

    category: string | '';
    subcategory: string | '';
    brand: string | '';
    model: string | '';
    year: number | null;
    price: string | '';
    enginePower: number | null;
    kilometrage: number | null;

    fuel: string | '';
    condition: string | '';
    county: string | '';
    sellerType: string | '';
    buyOrLease: string | '';
    driveType?: string | null;
    gearCount?: number | null;
    fuelConsumption?: number | null;
    warranty?: string | null;
    gearType: string | '';
    color: string | '';
    doorNumber: number | null;
    drivingLicence: string | '';
    weight: number | null;
    payload: number | null;
    volume: number | null;

    title: string | '';
    description: string | '';
    previewImg: string | '';

    dateCreated: string | null;
    dateLastUpdated: string | null;
    sellerUsername?: string | null;
    is_saved?: boolean;
    savedAt?: string | null;
};

export type PublicSeller = {
    verified?: boolean;
    badges?: string[];
    dealerStatus?: string;
    dealerProfile?: { businessName: string; address: string; registrationNumber: string; website: string } | null;
    id: number;
    username: string;
    pfp: string | null;
    city: string | null;
    country: string | null;
    memberSince: string | null;
};

export type AdFullData = AdCardData & {
    engineSize?: number | null;
    vin?: string | null;
    moderationStatus?: string | null;
    moderationReason?: string | null;
    enginePower?: number | null;
    images: string[];
};
