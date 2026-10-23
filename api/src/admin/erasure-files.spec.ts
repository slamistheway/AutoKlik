import { deleteImage } from '../object-storage';
import { UserAdminService } from './user-admin.service';

jest.mock('../object-storage', () => ({ deleteImage: jest.fn() }));

describe('Erased account upload cleanup', () => {
  function setup(shared = false, pending = 0, role = 'admin') {
    const remove = jest.fn().mockResolvedValue(undefined);
    const queries = [
      { from: () => ({ where: async () => [{ role, status: 'active' }] }) },
      { from: () => ({ limit: async () => [{ path: 'ad-images/fixture.jpg' }, { path: '../private' }] }) },
      { from: () => ({ where: () => ({ limit: async () => shared ? [{ id: 1 }] : [] }) }) },
      { from: () => ({ where: () => ({ limit: async () => [] }) }) },
      { from: async () => [{ total: pending }] },
    ];
    const db = { select: jest.fn(() => queries.shift()), delete: () => ({ where: remove }), insert: () => ({ values: async () => undefined }) };
    return { service: new UserAdminService(db as unknown as ConstructorParameters<typeof UserAdminService>[0]), remove };
  }
  beforeEach(() => { jest.clearAllMocks(); (deleteImage as jest.Mock).mockResolvedValue(undefined); });
  it('deletes only validated bucket keys and never traversal paths', async () => {
    const { service, remove } = setup();
    expect(await service.cleanupFiles(1)).toEqual({ removed: 1, pending: 0 });
    expect(deleteImage).toHaveBeenCalledTimes(1);
    expect(deleteImage).toHaveBeenCalledWith('ad-images/fixture.jpg');
    expect(remove).toHaveBeenCalledTimes(1);
  });
  it('preserves files still referenced by another account or ad', async () => {
    const { service } = setup(true);
    await service.cleanupFiles(1);
    expect(deleteImage).not.toHaveBeenCalled();
  });
  it('keeps failed cleanup queued instead of claiming it completed', async () => {
    (deleteImage as jest.Mock).mockRejectedValue(new Error('Storage unavailable'));
    const { service, remove } = setup(false, 1);
    expect(await service.cleanupFiles(1)).toEqual({ removed: 0, pending: 1 });
    expect(remove).not.toHaveBeenCalled();
  });
  it('denies moderators', async () => {
    await expect(setup(false, 0, 'moderator').service.cleanupFiles(1)).rejects.toMatchObject({ status: 403 });
    expect(deleteImage).not.toHaveBeenCalled();
  });
});
