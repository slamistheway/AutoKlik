export class LoginDto  {
    identifier: string;
    password: string;
}

export class RegisterDto {
    username: string;
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    country?: string;
}

export class UpdateProfileDto {
    firstName?: string;
    lastName?: string;
    phone?: string;
    city?: string;
    country?: string;
}


