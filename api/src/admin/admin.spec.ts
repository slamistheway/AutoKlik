import { AdminGuard } from './admin.guard';
import { dateInput, moderationInput, positiveId } from './admin-validation';
import { imageDigest } from './image-digest';
import type { ExecutionContext } from '@nestjs/common';

describe('Admin authorization and input boundaries', () => {
  const context = (request: object) => ({ switchToHttp: () => ({ getRequest: () => request }) }) as ExecutionContext;
  const guard = (role?: string, status = 'active', reset = false) => new AdminGuard({ select: () => ({ from: () => ({ where: async () => role ? [{ role, status, reset }] : [] }) }) } as unknown as ConstructorParameters<typeof AdminGuard>[0]);

  it('denies anonymous, ordinary, deleted and invalid-role accounts', async () => {
    for (const status of ['suspended', 'banned', 'deleted']) await expect(guard('admin', status).canActivate(context({ user: { id: 1 } }))).rejects.toMatchObject({ status: 403 });
    await expect(guard('admin', 'active', true).canActivate(context({ user: { id: 1 } }))).rejects.toMatchObject({ status: 403 });
    await expect(guard('admin').canActivate(context({}))).rejects.toMatchObject({ status: 403 });
    for (const role of ['user', 'dealer', '', undefined]) await expect(guard(role).canActivate(context({ user: { id: 1 } }))).rejects.toMatchObject({ status: 403 });
  });

  it('reads current database roles instead of trusting session role claims', async () => {
    for (const role of ['admin', 'moderator']) {
      const request = { user: { id: 1, role: 'user' }, staffRole: '' };
      await expect(guard(role).canActivate(context(request))).resolves.toBe(true);
      expect(request.staffRole).toBe(role);
    }
    await expect(guard('user').canActivate(context({ user: { id: 1, role: 'admin' } }))).rejects.toMatchObject({ status: 403 });
  });

  it('validates all bulk targets before any mutation and requires an audit reason', () => {
    expect(moderationInput({ ids: [3, 1, 3], decision: 'remove', reason: ' Rule violation ' })).toEqual({ ids: [1, 3], decision: 'remove', reason: 'Rule violation' });
    for (const ids of [[], [1, -1], [1, true], ['1'], Array.from({ length: 101 }, (_, i) => i + 1)]) expect(() => moderationInput({ ids, decision: 'approve', reason: 'Review' })).toThrow();
    for (const body of [{ ids: [1], decision: 'delete', reason: 'Review' }, { ids: [1], decision: 'approve', reason: '  ' }, { ids: [1], decision: 'approve', reason: 'Review', role: 'admin' }]) expect(() => moderationInput(body)).toThrow();
  });

  it('rejects coercible and malformed IDs and impossible dates', () => {
    for (const value of [true, null, {}, '1e2', '1.0', 0, -1, 1.5]) expect(() => positiveId(value)).toThrow();
    for (const value of ['2026-02-30', '2026-13-01', '17-10-2026']) expect(() => dateInput(value)).toThrow();
    expect(dateInput('2026-10-17', true).toISOString()).toBe('2026-10-18T00:00:00.000Z');
  });

  it('never reads arbitrary files or fetches remote URLs during photo indexing', async () => {
    for (const path of ['../.env', 'ad-images/../../.env', 'https://example.test/photo.jpg', 'ad-images/a/secret', 'ad-images/..']) expect(await imageDigest(path)).toBeNull();
  });
});
