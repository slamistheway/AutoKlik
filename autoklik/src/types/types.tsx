import {useState} from "react";

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

export interface AdCardData { //popravi data typeove
    id: number;
    title: string;
    price: string;
    year: string;
    mileage: string;
    location: string;
    fuel?: string;
    condition?: string;
    
    sellerType?: string;
    sellerName?: string;

    image: string; //pretvori ovo u preview_img
}

export type AdFullData = { //popravi data typeove
    id?: number;
    brand: string;
    model: string;

    price: number | string | null;
    year: string | null;
    mileage: string | null;
    county: string | null; //pretvori ovo u location
    fuel: string | null;
    enginePower: string | null;
    condition: string | null;

    sellerType: string | null;
    seller_username?: string | null;

    title: string | null;
    description: string | null;

    preview_img?: string | null;
    images?: string[];
};

