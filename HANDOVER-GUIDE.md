# Ridaas Fashion — complete source handover

This package contains the complete storefront, administration dashboard, backend API, database migration, brand assets, automated tests, and compiled deployment build.

It does **not** contain passwords, login cookies, Instagram tokens, hosting secrets, live customer orders, the hosted database, or uploaded product files. Those must never be shared in source code.

## What is included

- `src/client.js` — storefront and administration interface
- `src/style.css` — responsive Ridaas design
- `src/server.js` — backend API, authorization, inventory, orders, uploads, and Instagram feed reader
- `assets/` — approved Ridaas logo and current catalog imagery
- `drizzle/0000_ridaas_store.sql` — database schema
- `tests/` — backend, authorization, and stock-reservation checks
- `dist/server/index.js` — compiled Cloudflare-compatible Worker
- `build.mjs` — source build script
- `preview-v2.mjs` — development-only local preview
- `.env.example` — names of required environment settings, with no secret values
- `wrangler.example.json` — example independent Cloudflare configuration
- `.openai/hosting.json` — manifest for the current ChatGPT Sites project; do not reuse its project ID for a different account
- `START-HERE.md` — original operating guide

## Open in VS Code

1. Extract the ZIP file.
2. Open VS Code.
3. Select **File → Open Folder** and choose `ridaas-fashion-complete-source`.
4. Install Node.js 20 or later.
5. Open the VS Code terminal and run `npm run check`, `npm test`, then `npm run build`.
6. For a local development preview, run `node preview-v2.mjs` and open the address shown in the terminal. The preview uses a separate local test database and development-only identity; never deploy the preview server.

## Store administration

The manager is at `/admin`. It supports product creation and editing, PNG/JPG/WebP uploads, prices, total available quantity, draft/published/archived visibility, orders, order progress, branding, and manual Instagram refresh.

The current ChatGPT Sites deployment trusts identity supplied by the Sites sign-in gateway and authorizes the email stored as `ADMIN_EMAIL`. For independent hosting, do not trust browser-supplied `oai-authenticated-user-*` headers. Replace `admin()` in `src/server.js` with the new host's verified authentication or Cloudflare Access validation.

## Independent Cloudflare deployment

1. Create a Cloudflare account owned by the store owner.
2. Create a D1 database and R2 bucket in that account.
3. Copy `wrangler.example.json` to the host's actual Wrangler configuration and replace placeholder resource identifiers.
4. Apply `drizzle/0000_ridaas_store.sql` once to the new D1 database.
5. Configure `ADMIN_EMAIL` as a protected hosting environment variable.
6. Build and deploy `dist/server/index.js` after implementing verified administrator authentication.
7. Connect the purchased domain in the store owner's Cloudflare account.
8. Add and verify products before accepting customer orders.

## Instagram connection

Never place an Instagram password in this project or send it to a developer. Use Meta's official authorization flow for an Instagram Business or Creator account. Store `INSTAGRAM_ACCESS_TOKEN` as a hosting secret and configure `INSTAGRAM_USER_ID` and a currently supported `INSTAGRAM_API_VERSION`. The scheduled handler can refresh the cached feed; `wrangler.example.json` contains a 30-minute example schedule.

Instagram posts appear in the social feed. They do not automatically become purchasable products because posts do not provide verified price, size, or inventory data. Products and quantities should be confirmed in the manager.

## Before public launch

1. Replace the administrator email and test the new owner's login.
2. Verify every product photo, name, price, size, and available quantity.
3. Place a test order and confirm that stock decreases; cancel it and confirm stock is restored once.
4. Add real delivery, contact, return, refund, and privacy information.
5. Configure COD and/or a payment gateway owned by the business.
6. Complete Instagram authorization and token-renewal procedures.
7. Back up the database and product uploads.

The existing hosted site and its live data remain attached to the original ChatGPT Sites account. This source package allows a developer to build and deploy an independent copy, but it does not automatically transfer the live hosting account, database, uploads, domain, or customer records.
