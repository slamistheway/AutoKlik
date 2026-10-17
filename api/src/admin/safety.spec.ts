import { accountRestriction, normalizeBlockValue } from '../auth/account-access';
import { scamSignals } from '../users/scam-signals';
import { dealerProfile } from './user-admin.service';

describe('Safety signals and account restrictions', () => {
  it('flags high-risk patterns but leaves ordinary messages alone', () => {
    expect(scamSignals('Je li vozilo dostupno? https://autoklik.example/ad/12')).toEqual([]);
    expect(scamSignals('Send your password to https://bit.ly/vehicle')).toEqual(expect.arrayContaining(['credential_request', 'shortened_link']));
    expect(scamSignals('Uplati depozit unaprijed putem Western Union')).toEqual(expect.arrayContaining(['advance_payment', 'risky_payment']));
    expect(scamSignals('https://127.0.0.1/login')).toContain('suspicious_link');
    expect(scamSignals('https://user:secret@example.test')).toContain('suspicious_link');
  });
  it('normalizes block values consistently without broad phone substring matches', () => {
    expect(normalizeBlockValue('email', ' USER@Example.test ')).toBe('user@example.test');
    expect(normalizeBlockValue('phone', '+385 (91) 123-4567')).toBe('385911234567');
    expect(normalizeBlockValue('phone', '00385 91 1234567')).toBe('385911234567');
    expect(normalizeBlockValue('ip', '::ffff:192.0.2.5')).toBe('192.0.2.5');
    expect(normalizeBlockValue('ip', '2001:0db8:0:0:0:0:0:1')).toBe('2001:db8::1');
    expect(normalizeBlockValue('ip', '192.0.2.0/24')).toBe('');
  });
  it('requires password reset and blocks suspended, banned and erased identities', () => {
    for (const accountStatus of ['suspended', 'banned', 'deleted']) expect(accountRestriction({ accountStatus })).toBeTruthy();
    expect(accountRestriction({ accountStatus: 'active', passwordResetRequired: true })).toBeTruthy();
    expect(accountRestriction({ accountStatus: 'active', passwordResetRequired: false })).toBeNull();
  });
  it('rejects unsafe dealer URLs and requires complete business details', () => {
    expect(() => dealerProfile({ businessName: 'Dealer', registrationNumber: '123', address: 'Street', website: 'javascript:alert(1)' })).toThrow();
    expect(() => dealerProfile({ businessName: 'Dealer' })).toThrow();
  });
});
