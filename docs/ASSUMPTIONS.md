# Assumptions

- Steam inventory JSON shape varies; the parser scans nested objects/arrays for `market_hash_name` keys and skips anything missing it.
- Currency is USD and CSFloat prices are treated as integer cents.
- JWT auth is short-lived with re-login (no refresh token yet).
- Password reset tokens are surfaced in server logs for the MVP.
- Hourly price snapshots are acceptable even if some datapoints are missing.
- All timestamps are stored and queried in UTC.
