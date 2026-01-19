import { describe, expect, it, vi, beforeEach } from 'vitest';
import { CsfloatService } from './csfloatService.js';
import { config } from '../config.js';

const mockFetch = vi.fn();

global.fetch = mockFetch as unknown as typeof fetch;

describe('CsfloatService', () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it('caches price requests within TTL', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ listings: [{ price: 12345 }] })
    });

    const service = new CsfloatService('');
    const price1 = await service.getPriceCents('Test Item');
    const price2 = await service.getPriceCents('Test Item');

    expect(price1).toBe(12345);
    expect(price2).toBe(12345);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('backs off on rate limiting', async () => {
    config.csfloatRateLimitMs = 0;
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ listings: [{ price: 999 }] })
      });

    const service = new CsfloatService('');
    const price = await service.getPriceCents('Rate Limit Item');

    expect(price).toBe(999);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});
