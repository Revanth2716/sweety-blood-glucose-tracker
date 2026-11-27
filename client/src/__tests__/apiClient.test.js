import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, ApiError } from '../api/client.js';

describe('api client', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('turns the error envelope of the API into an ApiError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        text: async () =>
          JSON.stringify({
            error: {
              message: 'You already have an After lunch reading for this date.',
              code: 'SLOT_TAKEN',
              field: 'slot',
            },
          }),
      }),
    );

    const error = await apiFetch('/readings', { method: 'POST', body: {} }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error.message).toBe('You already have an After lunch reading for this date.');
    expect(error.status).toBe(409);
    expect(error.field).toBe('slot');
  });

  it('sends the access token and the JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ reading: { id: '1' } }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await apiFetch('/readings', { method: 'POST', body: { value: 120 }, token: 'a-token' });

    const [url, options] = fetchMock.mock.calls[0];
    expect(url).toContain('/readings');
    expect(options.method).toBe('POST');
    expect(options.headers.Authorization).toBe('Bearer a-token');
    expect(options.headers['Content-Type']).toBe('application/json');
    expect(JSON.parse(options.body)).toEqual({ value: 120 });
  });

  it('falls back to a friendly message when the API does not send one', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 500, text: async () => '' }),
    );

    await expect(apiFetch('/readings')).rejects.toThrow('Something went wrong. Please try again.');
  });
});
