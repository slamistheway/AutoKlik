import { BadRequestException } from '@nestjs/common';

export const decisions = ['approve', 'reject', 'changes', 'remove', 'restore', 'pending'] as const;
export type Decision = typeof decisions[number];

export function object(value: unknown, allowed: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !allowed.includes(key))) {
    throw new BadRequestException('Neispravna polja.');
  }
  return value as Record<string, unknown>;
}

export function positiveId(value: unknown) {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^\d+$/.test(value))) throw new BadRequestException('Neispravan ID.');
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw new BadRequestException('Neispravan ID.');
  return id;
}

export function note(value: unknown) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 1000 || /[\x00-\x08\x0b-\x1f\x7f]/.test(value)) throw new BadRequestException('Unesite razlog (najviše 1000 znakova).');
  return value.trim();
}

export function moderationInput(value: unknown) {
  const body = object(value, ['ids', 'decision', 'reason']);
  if (!Array.isArray(body.ids) || !body.ids.length || body.ids.length > 100 || body.ids.some(id => typeof id !== 'number')) throw new BadRequestException('Odaberite 1–100 oglasa.');
  const ids = [...new Set(body.ids.map(positiveId))].sort((a, b) => a - b);
  if (!decisions.includes(body.decision as Decision)) throw new BadRequestException('Neispravna odluka.');
  return { ids, decision: body.decision as Decision, reason: note(body.reason) };
}

export function periodInput(value: unknown) {
  if (value !== 'day' && value !== 'week' && value !== 'month') throw new BadRequestException('Neispravno razdoblje.');
  const hours = value === 'day' ? 24 : value === 'week' ? 168 : 720;
  return { period: value, hours, bucket: value === 'day' ? 'hour' : 'day' } as const;
}

export function dateInput(value: unknown, end = false) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new BadRequestException('Neispravan datum.');
  const date = new Date(value + 'T00:00:00.000Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw new BadRequestException('Neispravan datum.');
  if (end) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}
