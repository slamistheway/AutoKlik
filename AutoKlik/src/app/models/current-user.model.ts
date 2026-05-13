export interface CurrentUser {
  id: number;
  username: string;
  email: string;
  pfp: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  city?: string;
  country?: string;
}
