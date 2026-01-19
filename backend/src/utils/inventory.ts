export interface InventoryParseResult {
  counts: Record<string, number>;
  metadata: Record<string, { displayName?: string; iconUrl?: string }>;
  skipped: number;
}

const MAX_NODES = 50000;

const pushName = (name: string | undefined, counts: Record<string, number>) => {
  if (!name) return false;
  counts[name] = (counts[name] || 0) + 1;
  return true;
};

export const parseInventoryPayload = (payload: unknown): InventoryParseResult => {
  const counts: Record<string, number> = {};
  const metadata: Record<string, { displayName?: string; iconUrl?: string }> = {};
  let skipped = 0;
  let scanned = 0;

  const queue: unknown[] = [payload];
  while (queue.length > 0) {
    if (scanned > MAX_NODES) break;
    const current = queue.shift();
    scanned += 1;

    if (Array.isArray(current)) {
      for (const item of current) {
        queue.push(item);
      }
      continue;
    }

    if (current && typeof current === 'object') {
      const record = current as Record<string, unknown>;
      if (typeof record.market_hash_name === 'string') {
        const name = record.market_hash_name;
        pushName(name, counts);
        if (!metadata[name]) {
          metadata[name] = {
            displayName:
              typeof record.market_name === 'string'
                ? record.market_name
                : typeof record.name === 'string'
                  ? record.name
                  : undefined,
            iconUrl:
              typeof record.icon_url_large === 'string'
                ? record.icon_url_large
                : typeof record.icon_url === 'string'
                  ? record.icon_url
                  : undefined
          };
        }
        continue;
      }
      for (const value of Object.values(record)) {
        queue.push(value);
      }
    }
  }

  if (Object.keys(counts).length === 0) {
    skipped = 1;
  }

  return { counts, metadata, skipped };
};
