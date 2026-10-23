import { deleteImage, downloadImage, uploadImage } from './object-storage';

describe('Supabase object storage', () => {
  const originalFetch = global.fetch;
  const environment = { ...process.env };
  let fetchMock: jest.Mock;

  beforeEach(() => {
    process.env.SUPABASE_URL = 'https://storage-test.supabase.co';
    process.env.SUPABASE_SECRET_KEY = 'sb_secret_server-only-test-key';
    fetchMock = jest.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    global.fetch = fetchMock;
  });
  afterEach(() => { global.fetch = originalFetch; process.env = { ...environment }; });

  it('uploads bytes to the mapped bucket without overwriting', async () => {
    await uploadImage('pfp/photo.png', Buffer.from('image'), 'image/png');
    expect(fetchMock).toHaveBeenCalledWith('https://storage-test.supabase.co/storage/v1/object/avatars/photo.png', expect.objectContaining({
      method: 'POST', redirect: 'error', body: new Uint8Array(Buffer.from('image')),
      headers: expect.objectContaining({ apikey: 'sb_secret_server-only-test-key', 'Content-Type': 'image/png', 'x-upsert': 'false' }),
    }));
    expect(fetchMock.mock.calls[0][1].headers).not.toHaveProperty('Authorization');
  });

  it('never fetches external URLs or traversal paths', async () => {
    for (const path of ['../.env', 'ad-images/../secret.png', 'https://example.test/a.png', 'pfp/a.svg']) {
      await expect(downloadImage(path)).rejects.toMatchObject({ status: 400 });
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('downloads exact stored bytes', async () => {
    fetchMock.mockResolvedValue(new Response('image-data'));
    expect(await downloadImage('ad-images/photo.jpg')).toEqual(Buffer.from('image-data'));
  });

  it('deletes only the requested object', async () => {
    await deleteImage('ad-images/photo.jpg');
    expect(fetchMock).toHaveBeenCalledWith('https://storage-test.supabase.co/storage/v1/object/ad-images', expect.objectContaining({
      method: 'DELETE', body: JSON.stringify({ prefixes: ['photo.jpg'] }),
    }));
  });

  it('reports storage failures without leaking provider responses or secrets', async () => {
    fetchMock.mockResolvedValue(new Response('sensitive provider detail', { status: 403 }));
    await expect(uploadImage('ad-images/photo.jpg', Buffer.from('image'), 'image/jpeg')).rejects.toMatchObject({ status: 503 });
    fetchMock.mockRejectedValue(new Error('network failure'));
    await expect(downloadImage('ad-images/photo.jpg')).rejects.toMatchObject({ status: 503 });
  });

  it('requires server credentials and reports missing objects', async () => {
    delete process.env.SUPABASE_SECRET_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    await expect(downloadImage('pfp/photo.png')).rejects.toMatchObject({ status: 503 });
    expect(fetchMock).not.toHaveBeenCalled();
    process.env.SUPABASE_SECRET_KEY = 'server-only-test-key';
    fetchMock.mockResolvedValue(new Response('{}', { status: 404 }));
    await expect(downloadImage('pfp/photo.png')).rejects.toMatchObject({ status: 404 });
  });
});
