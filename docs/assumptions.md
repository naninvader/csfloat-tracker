# Assumptions

* Steam inventory JSON formats vary; the importer attempts to read `assets` + `descriptions` when available, and falls back to arrays of descriptions or items with `market_hash_name`.
* If `market_hash_name` is missing, the item is skipped.
* Default currency is USD; CSFloat prices are treated as integer cents and stored as-is.
* Password reset returns the token in the API response for local development; production should send an email.
