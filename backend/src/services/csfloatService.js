import axios from 'axios';

const baseURL = process.env.CSFLOAT_BASE_URL || 'https://csfloat.com/api/v1';
const apiKey = process.env.CSFLOAT_API_KEY;

const cache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

let lastRequestTime = 0;
const MIN_INTERVAL_MS = Number(process.env.CSFLOAT_MIN_INTERVAL_MS || 1000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestWithThrottle = async (fn, attempt = 0) => {
  const now = Date.now();
  const wait = Math.max(0, MIN_INTERVAL_MS - (now - lastRequestTime));
  if (wait > 0) {
    await sleep(wait);
  }
  lastRequestTime = Date.now();
  try {
    return await fn();
  } catch (err) {
    if (err.response?.status === 429 && attempt < 5) {
      const backoff = Math.min(30_000, 500 * 2 ** attempt);
      const jitter = Math.floor(Math.random() * 250);
      await sleep(backoff + jitter);
      return requestWithThrottle(fn, attempt + 1);
    }
    throw err;
  }
};

const getCached = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

const setCached = (key, value) => {
  cache.set(key, { value, ts: Date.now() });
};

export const fetchPriceList = async () => {
  const cacheKey = 'price-list';
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const response = await requestWithThrottle(() =>
    axios.get(`${baseURL}/price-list`, {
      headers: apiKey ? { Authorization: apiKey } : undefined,
    }),
  );
  setCached(cacheKey, response.data);
  return response.data;
};

export const fetchLowestListing = async (marketHashName) => {
  const cacheKey = `listing:${marketHashName}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;
  const response = await requestWithThrottle(() =>
    axios.get(`${baseURL}/listings`, {
      params: {
        market_hash_name: marketHashName,
        sort_by: 'lowest_price',
        limit: 1,
      },
      headers: apiKey ? { Authorization: apiKey } : undefined,
    }),
  );
  const priceCents = response.data?.data?.[0]?.price ?? null;
  setCached(cacheKey, priceCents);
  return priceCents;
};

export const getPricesForItems = async (marketHashNames) => {
  const usePriceList = process.env.CSFLOAT_USE_PRICE_LIST === 'true';
  if (usePriceList) {
    const data = await fetchPriceList();
    const priceMap = new Map();
    for (const entry of data?.data || []) {
      if (entry.market_hash_name && entry.lowest_price) {
        priceMap.set(entry.market_hash_name, entry.lowest_price);
      }
    }
    return marketHashNames.map((name) => ({
      marketHashName: name,
      priceCents: priceMap.get(name) ?? null,
    }));
  }
  const results = [];
  for (const name of marketHashNames) {
    const price = await fetchLowestListing(name);
    results.push({ marketHashName: name, priceCents: price ?? null });
  }
  return results;
};
