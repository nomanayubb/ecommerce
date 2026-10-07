# Spec notes (original PRD/DRD → what we changed and why)

The original document defined 100 features, a Postgres schema, REST endpoints, a mascot component and a theme-editor design. Full text is not stored here; this file records only decisions that differ from or extend it.

## Schema fixes
- `3d_model_url` is an invalid unquoted identifier → `model_3d_url`.
- Added `products.stock_quantity`, `moq`, `images`; `CHECK (stock_quantity >= 0)` on products and variants.
- Added `price_tiers (product_id, min_qty, unit_price)` for volume/wholesale breaks (spec had only a single `wholesale_price`).
- `status` constrained to DRAFT/PUBLISHED/ARCHIVED; `themes` has a partial unique index so only one theme is active.
- Timestamps are `TIMESTAMPTZ`, defaults NOT NULL.

## Checkout controller (spec §4B) problems fixed
- It never checked or decremented stock (oversell) → rows locked `FOR UPDATE`, stock checked and decremented in one transaction.
- Ignored variants and tiers → handled in `lib/pricing.ts`.
- Hard-coded fake gateway URLs → replaced with a gate (`ENABLED_PAYMENT_METHODS`) and a stub; real adapters pending.
- Returned raw error messages as 500s → centralized error handler.

## Security decisions
- Role is never client-supplied at registration; wholesale applicants are `PENDING` until an admin approves.
- Wholesale price is not exposed on the public product endpoint; it applies only via cart pricing for approved buyers (JWT claim).
- Theme editor (spec §5): storing and compiling admin-supplied TSX is remote-code-execution surface. When built: compile in an isolated worker/container, no filesystem/network, validate AST, never `eval` in the API process.

## Deferred / changed
- Search runs on Postgres `ILIKE` until the Typesense sync exists.
- EasyPaisa/JazzCash: no API access yet.
- Microservices split from the spec is deferred: one API process with route modules; split later only if needed.
