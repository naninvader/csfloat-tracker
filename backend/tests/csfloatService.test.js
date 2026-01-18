import test from 'node:test';
import assert from 'node:assert/strict';
import axios from 'axios';

import { getPricesForItems } from '../src/services/csfloatService.js';

const originalGet = axios.get;

test('getPricesForItems falls back to listings endpoint', async () => {
  process.env.CSFLOAT_USE_PRICE_LIST = 'false';
  axios.get = async () => ({ data: { data: [{ price: 1234 }] } });

  const result = await getPricesForItems(['AK-47 | Redline']);

  assert.equal(result.length, 1);
  assert.equal(result[0].priceCents, 1234);
});

test.after(() => {
  axios.get = originalGet;
});
