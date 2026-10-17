import { ForbiddenException } from '@nestjs/common';
import { isIP } from 'net';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../db/schema';

export function normalizeBlockValue(kind: string, value: string) {
  if (kind === 'email') return value.trim().toLowerCase();
  if (kind === 'phone') return value.replace(/[^\d]/g, '').replace(/^00/, '');
  if (kind === 'ip') {
    const ip = value.trim().toLowerCase().replace(/^::ffff:(?=\d+\.)/, '');
    if (!isIP(ip)) return '';
    return isIP(ip) === 6 ? new URL(`http://[${ip}]`).hostname.slice(1, -1) : ip;
  }
  return '';
}

export function accountRestriction(user: { accountStatus?: string; passwordResetRequired?: boolean }) {
  if (user.accountStatus === 'deleted') return 'Račun nije dostupan.';
  if (user.accountStatus === 'banned') return 'Račun je zabranjen. Žalbu možete poslati na stranici /appeal.';
  if (user.accountStatus === 'suspended') return 'Račun je suspendiran. Žalbu možete poslati na stranici /appeal.';
  if (user.passwordResetRequired) return 'Potrebna je promjena lozinke. Otvorite /forgot-password.';
  return null;
}

export async function assertNotBlocked(db: NodePgDatabase<typeof schema>, user: { email?: string | null; phone?: string | null }, ip: string | null) {
  const email = normalizeBlockValue('email', user.email ?? '');
  const phone = normalizeBlockValue('phone', user.phone ?? '');
  const address = normalizeBlockValue('ip', ip ?? '');
  const result = await db.execute(sql`select id from safety_blocklist where active and
    ((kind = 'email' and value = ${email}) or (kind = 'phone' and value = ${phone}) or (kind = 'ip' and value = ${address})) limit 1`);
  if (result.rows.length) throw new ForbiddenException('Pristup je ograničen sigurnosnim pravilima.');
}
