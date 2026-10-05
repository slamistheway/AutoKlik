import { BadRequestException, Injectable } from '@nestjs/common';
import type { ArgumentMetadata, PipeTransform } from '@nestjs/common';

type Field = {
  kind: 'text' | 'number' | 'password';
  max: number;
  min?: number;
  required?: boolean;
  integer?: boolean;
  nullable?: boolean;
  multiline?: boolean;
  pattern?: RegExp;
};
type Rules = Record<string, Field>;
const text = (max: number, required = false): Field => ({
  kind: 'text',
  max,
  required,
});
const number = (min = 0, max = 2147483647, required = false): Field => ({
  kind: 'number',
  min,
  max,
  integer: true,
  required,
});
const id = { ...number(1, Number.MAX_SAFE_INTEGER, true) };
const profile: Rules = {
  firstName: { ...text(100), nullable: true },
  lastName: { ...text(100), nullable: true },
  phone: { ...text(20), nullable: true, pattern: /^[+\d\s().-]*$/ },
  city: { ...text(100), nullable: true },
  country: { ...text(100), nullable: true },
};
const ad: Rules = {
  user_id: number(1, Number.MAX_SAFE_INTEGER),
  category: text(100, true),
  subcategory: text(100),
  brand: text(100),
  model: text(100),
  title: text(200, true),
  description: { ...text(10000), multiline: true },
  year: number(1886, 2100, true),
  price: { ...number(0, 1e12), integer: false },
  kilometrage: number(),
  enginePower: { ...number(), nullable: true },
  fuel: text(100),
  condition: text(100),
  county: text(100),
  sellerType: text(100),
  buyOrLease: text(100),
  gearType: { ...text(100), nullable: true },
  color: { ...text(100), nullable: true },
  doorNumber: { ...number(0, 100), nullable: true },
  drivingLicence: text(100),
  weight: { ...number(), nullable: true },
  payload: { ...number(), nullable: true },
  volume: { ...number(), nullable: true },
};
const schemas: Record<string, Rules> = {
  LoginDto: {
    identifier: text(255, true),
    password: { kind: 'password', min: 1, max: 72, required: true },
  },
  RegisterDto: {
    ...profile,
    username: { ...text(50, true), pattern: /^[A-Za-z0-9]+$/ },
    email: { ...text(255, true), pattern: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/ },
    password: { kind: 'password', min: 8, max: 72, required: true },
  },
  UpdateProfileDto: profile,
  CreateAdDto: ad,
  UpdateAdDto: Object.fromEntries(
    Object.entries(ad).map(([key, rule]) => [
      key,
      { ...rule, required: false },
    ]),
  ),
  AdsQueryDto: {
    category: text(100),
    subcategory: text(100),
    brands: text(2000),
    models: text(2000),
    search: text(200),
    yearMin: number(1886, 2100),
    yearMax: number(1886, 2100),
    limit: number(1, 100),
    offset: number(),
  },
  ConversationDto: { otherUserId: id },
  SendMessageDto: {
    conversationId: id,
    body: { ...text(10000, true), multiline: true },
  },
  MessageImageDto: {
    conversationId: id,
    body: { ...text(10000), multiline: true },
  },
  ReadMessagesDto: { conversationId: id, throughMessageId: id },
};

export function validateInput(
  value: unknown,
  schema: string,
): Record<string, unknown> {
  if (!Object.hasOwn(schemas, schema))
    throw new BadRequestException('Nepoznat oblik zahtjeva.');
  const rules = schemas[schema];
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new BadRequestException('Zahtjev mora biti objekt.');
  const input = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const key of Object.keys(input)) {
    if (!Object.hasOwn(rules, key))
      throw new BadRequestException(`Nedopušteno polje: ${key}.`);
  }
  for (const [key, rule] of Object.entries(rules)) {
    const raw = input[key];
    const invalid = () => {
      throw new BadRequestException(
        `Polje ${key} nije ispravno ili prelazi dopuštenu duljinu.`,
      );
    };
    if (raw === undefined) {
      if (rule.required) invalid();
      continue;
    }
    if (raw === null || (raw === '' && rule.nullable)) {
      if (!rule.nullable) invalid();
      output[key] = null;
      continue;
    }
    if (rule.kind === 'number') {
      if (raw === '' && !rule.required) continue;
      if (
        typeof raw !== 'number' &&
        (typeof raw !== 'string' || !/^\d+(?:\.\d+)?$/.test(raw))
      )
        invalid();
      const parsed = Number(raw);
      if (
        !Number.isFinite(parsed) ||
        parsed < (rule.min ?? 0) ||
        parsed > rule.max ||
        (rule.integer && !Number.isSafeInteger(parsed))
      )
        invalid();
      output[key] = parsed;
      continue;
    }
    if (typeof raw !== 'string') invalid();
    const original = raw as string;
    if (rule.kind === 'password') {
      if (
        original.length < (rule.min ?? 1) ||
        Buffer.byteLength(original, 'utf8') > rule.max ||
        original.includes('\0')
      )
        invalid();
      output[key] = original;
      continue;
    }
    const clean = original.normalize('NFC').replace(/\r\n?/g, '\n').trim();
    const hasControls = [...clean].some((character) => {
      const code = character.charCodeAt(0);
      return (
        (code < 32 || code === 127) &&
        !(rule.multiline && (code === 9 || code === 10))
      );
    });
    if (
      clean.length > rule.max ||
      (rule.required && !clean.length) ||
      hasControls ||
      (rule.pattern && !rule.pattern.test(clean))
    )
      invalid();
    output[key] = key === 'email' ? clean.toLowerCase() : clean;
  }
  if (
    schema === 'AdsQueryDto' &&
    typeof output.yearMin === 'number' &&
    typeof output.yearMax === 'number' &&
    output.yearMin > output.yearMax
  ) {
    throw new BadRequestException(
      'Minimalna godina ne može biti veća od maksimalne.',
    );
  }
  return output;
}

@Injectable()
export class InputValidationPipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type === 'param') {
      if (
        typeof value !== 'string' ||
        !/^\d+$/.test(value) ||
        !Number.isSafeInteger(Number(value)) ||
        Number(value) <= 0
      ) {
        throw new BadRequestException('ID mora biti pozitivan cijeli broj.');
      }
      return value;
    }
    const name = metadata.metatype?.name;
    // Registration validation stays inside the failure-counted operation.
    if (name === 'RegisterDto') return value;
    if (name && Object.hasOwn(schemas, name)) return validateInput(value, name);
    return value;
  }
}
