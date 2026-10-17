import { robotsResponse } from '@/server/sitemap';

export const dynamic = 'force-dynamic';
export function GET() { return robotsResponse(); }
