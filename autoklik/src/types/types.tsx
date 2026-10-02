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
    userId: number;

    category: string | '';
    subcategory: string | '';
    brand: string | '';
    model: string | '';
    year: number | null;
    price: string | '';
    kilometrage: number | null;

    fuel: string | '';
    condition: string | '';
    county: string | '';
    sellerType: string | '';
    buyOrLease: string | '';
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

export type AdFullData = AdCardData & {
    images: string[];
};
