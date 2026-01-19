import { config } from '../config.js';

interface CacheEntry {
  priceCents: number;
  ts: number;
}

interface QueueTask<T> {
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

export class CsfloatService {
  private cache = new Map<string, CacheEntry>();
  private queue: QueueTask<number>[] = [];
  private processing = false;

  constructor(private apiKey: string) {}

  async getPriceCents(marketHashName: string): Promise<number> {
    const cached = this.cache.get(marketHashName);
    if (cached && Date.now() - cached.ts < config.csfloatCacheTtlMs) {
      return cached.priceCents;
    }

    return this.enqueue(async () => {
      const price = await this.fetchWithBackoff(marketHashName);
      this.cache.set(marketHashName, { priceCents: price, ts: Date.now() });
      return price;
    });
  }

  async getPriceList(): Promise<Record<string, number>> {
    const response = await fetch(config.csfloatPriceListUrl, {
      headers: this.buildHeaders()
    });

    if (!response.ok) {
      throw new Error(`Price list fetch failed: ${response.status}`);
    }

    const data = (await response.json()) as Record<string, { lowest_price: number }>;
    const mapped: Record<string, number> = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value?.lowest_price === 'number') {
        mapped[key] = value.lowest_price;
      }
    }
    return mapped;
  }

  private enqueue(fn: () => Promise<number>): Promise<number> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      if (!this.processing) {
        void this.processQueue();
      }
    });
  }

  private async processQueue() {
    this.processing = true;
    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (!task) continue;
      try {
        const result = await task.fn();
        task.resolve(result);
      } catch (error) {
        task.reject(error as Error);
      }
      await new Promise((resolve) => setTimeout(resolve, config.csfloatRateLimitMs));
    }
    this.processing = false;
  }

  private async fetchWithBackoff(marketHashName: string): Promise<number> {
    let attempt = 0;
    let delay = 500;
    while (attempt < 5) {
      attempt += 1;
      const response = await fetch(
        `https://csfloat.com/api/v1/listings?market_hash_name=${encodeURIComponent(
          marketHashName
        )}&sort_by=lowest_price&limit=1`,
        { headers: this.buildHeaders() }
      );

      if (response.status === 429) {
        const jitter = Math.floor(Math.random() * 200);
        await new Promise((resolve) => setTimeout(resolve, delay + jitter));
        delay *= 2;
        continue;
      }

      if (!response.ok) {
        throw new Error(`CSFloat request failed: ${response.status}`);
      }

      const data = (await response.json()) as { listings?: Array<{ price: number }> };
      const price = data.listings?.[0]?.price;
      if (typeof price !== 'number') {
        throw new Error('No price data available.');
      }
      return price;
    }

    throw new Error('CSFloat rate limit exceeded.');
  }

  private buildHeaders() {
    const headers: Record<string, string> = {
      Accept: 'application/json'
    };
    if (this.apiKey) {
      headers['Authorization'] = this.apiKey;
    }
    return headers;
  }
}
