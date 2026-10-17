export type Ad = {
  id: number; userId: number; seller: string | null; effectiveStatus: string;
  title: string | null; description: string | null; category: string | null; subcategory: string | null;
  brand: string | null; model: string | null; vin: string | null; price: string | null;
  year: number | null; kilometrage: number | null; enginePower: number | null;
  fuel: string | null; condition: string | null; county: string | null; sellerType: string | null;
  buyOrLease: string | null; gearType: string | null; driveType: string | null; gearCount: number | null;
  fuelConsumption: string | null; warranty: string | null; color: string | null; doorNumber: number | null;
  drivingLicence: string | null; weight: number | null; payload: number | null; volume: number | null;
  featured: boolean | null; pinned: boolean; dateCreated: string | null; dateLastUpdated: string | null;
  expiresAt: string; moderationReason: string | null;
};
export type Report = { id: number; targetType: 'ad' | 'user' | 'message'; targetId: number; reporterId: number | null; subjectUserId: number | null; reason: string; status: string; source: string; signals: string[]; violationConfirmed: boolean; resolutionNote: string | null; createdAt: string };
export type Activity = { id: number; actorId: number | null; actor: string | null; action: string; adId: number | null; reason: string; before: unknown; after: unknown; createdAt: string };
export type Detail = Ad & {
  photos: { id: number; imageUrl: string }[];
  otherAds: { id: number; title: string | null; status: string }[];
  reports: Report[]; decisions: Activity[];
  duplicates: { matches: { id: number; title: string | null; sameVin: boolean; samePhoto: boolean }[]; unindexedPhotos: number };
};
export type AdList = { items: Ad[]; total: number; page: number; pageSize: number; brands: string[]; sellers: { id: number; name: string }[] };
export type Dashboard = {
  stats: { totalAds: number; activeAds: number; totalUsers: number; newAds: number; newUsers: number; messagesSent: number; soldAds: number; expiredAds: number };
  queues: { pendingAds: number; openReports: number; flaggedMessages: number; newUsers: number };
  chart: { at: string; ads: number; users: number; messages: number }[];
  activity: Activity[]; newUsers: { id: number; username: string; createdAt: string }[];
  since: string; timezone: string;
};
