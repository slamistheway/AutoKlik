import { isIP } from 'net';

// Signals trigger review only. Do not reject messages or apply account penalties.
export function scamSignals(body: string): string[] {
  const signals = new Set<string>();
  if (/\b(western\s+union|moneygram|gift\s+cards?|poklon\s+kartic\w*)\b/i.test(body)) signals.add('risky_payment');
  if (/\b(send|share|pošalji|posalji)\b.{0,50}\b(otp|password|lozink\w*|verification\s+code|verifikacijski\s+kod)\b/i.test(body)) signals.add('credential_request');
  if (/\b(uplati|plati|pay)\b.{0,40}\b(unaprijed|advance|before\s+viewing)\b/i.test(body)) signals.add('advance_payment');
  for (const match of body.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    try {
      const url = new URL(match[0]);
      const host = url.hostname.replace(/^\[|\]$/g, '');
      if (['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd'].includes(host)) signals.add('shortened_link');
      if (isIP(host) || host.split('.').some(label => label.startsWith('xn--')) || url.username || url.password) signals.add('suspicious_link');
    } catch { signals.add('malformed_link'); }
  }
  return [...signals];
}
