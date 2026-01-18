export const parseInventory = (payload) => {
  const counts = new Map();

  if (payload?.assets && payload?.descriptions) {
    const descMap = new Map();
    for (const desc of payload.descriptions) {
      if (!desc.classid) continue;
      const key = `${desc.classid}:${desc.instanceid || '0'}`;
      descMap.set(key, desc);
    }
    for (const asset of payload.assets) {
      const key = `${asset.classid}:${asset.instanceid || '0'}`;
      const desc = descMap.get(key);
      const marketHashName = desc?.market_hash_name || desc?.market_name;
      if (!marketHashName) continue;
      counts.set(marketHashName, (counts.get(marketHashName) || 0) + 1);
    }
  } else if (Array.isArray(payload?.descriptions)) {
    for (const desc of payload.descriptions) {
      const marketHashName = desc?.market_hash_name || desc?.market_name;
      if (!marketHashName) continue;
      counts.set(marketHashName, (counts.get(marketHashName) || 0) + 1);
    }
  } else if (Array.isArray(payload)) {
    for (const entry of payload) {
      const marketHashName = entry?.market_hash_name || entry?.market_name;
      if (!marketHashName) continue;
      counts.set(marketHashName, (counts.get(marketHashName) || 0) + 1);
    }
  }

  return Array.from(counts.entries()).map(([marketHashName, quantity]) => ({
    marketHashName,
    quantity,
  }));
};
