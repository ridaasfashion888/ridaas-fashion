# Ridaas Fashion — your website and backend

## Open your store

Store: https://ridaas-boutique.gopinath980733.chatgpt.site/

Manager: https://ridaas-boutique.gopinath980733.chatgpt.site/admin

The hosted site remains private to its owner. The manager checks the owner email on every administrative API request. There is no first-visitor admin claim. Owner identity is supplied by the trusted Sites authentication gateway.

Admin account: sign in with your existing ChatGPT account associated with `gopinath@1pathstudio.com`. No separate store password has been created or included in the source. If another staff account needs access, ask for a controlled access change; do not share your personal password. This is currently an owner-only review site, not a public customer store.

## First-launch checklist

1. Review every imported photo, description, price, size and available quantity; the original catalog was illustrative, not verified inventory.
2. Add your actual products and archive anything that is not for sale.
3. Place a test order, check the remaining quantity, then cancel it and check the restored quantity.
4. Confirm payment method, delivery charges, business contact details, and your return/privacy policies before public launch. These have not been invented for you.
5. Complete Instagram authorization before enabling scheduled refreshes.
6. Ask to make the storefront public only when you are ready; keep the manager restricted to the owner.

## Design comparison

Reference stores reviewed on 30 September 2026: [Suta](https://suta.in/) and [Nicobar](https://www.nicobar.com/). They are references for shopping navigation and fashion presentation, not copied templates. Ridaas keeps its own approved gold/peach logo, searchable category-led catalog, stock labels and simple shopping bag. Larger-store capabilities such as customer accounts, paid checkout, shipping integrations and published return policies remain launch work rather than decorative buttons that pretend to work.

## 1. Add a product

1. Open the manager and select **Add product**.
2. Enter the name, category, description and preferred sizes.
3. Enter the price in rupees; leave blank for price on request.
4. Enter **Available quantity** as a whole number. This is total stock for the product, not separate stock for each size.
5. Upload a PNG, JPG or WebP image under 8 MB.
6. Choose Draft to keep it hidden, or Published to show it.
7. Select Save product.

## 2. Change or remove a product

Use Products → Edit. Change quantities as stock arrives. Archive hides a product without deleting its history. You can restore it by editing its visibility. A quantity of zero displays Out of stock.

## 3. Handle orders

Customers send order requests, not paid purchases. A successful request reserves stock atomically. Open Orders to see contact details, preferred sizes and notes. Change progress as you fulfil the request. Cancelling returns reserved stock once. Cancelled requests cannot reopen; submit a new request instead. Contact customers manually to confirm final pricing and delivery. Online payments, tax calculation, shipping labels and automated emails are not connected.

## 4. Change your logo and text

Branding lets you upload a replacement logo and edit the store name, introduction, headline, location, announcement and Instagram link. Select Save branding. Colours and layout are in `src/style.css`.

## 5. Instagram automation

Instagram is not connected yet. The supplied source includes an official API reader, owner-only Refresh posts button, persistent feed cache and scheduled handler. New photos/reels and captions appear in a separate Instagram feed after refresh. It does not turn arbitrary posts into purchasable products, overwrite quantities or promise to mirror stories, deletions and all profile changes.

To enable it, a developer must:

1. Set up a Meta application with Instagram Login for your Business or Creator account and authorize the media-reading permission required by the current Meta API.
2. Store `INSTAGRAM_ACCESS_TOKEN`, `INSTAGRAM_USER_ID`, and a currently supported `INSTAGRAM_API_VERSION` in hosting secrets. Never send passwords or tokens in product forms or publish them in source code.
3. Use Instagram → Refresh posts to verify the connection.
4. On an independently hosted Cloudflare Worker, copy and configure `wrangler.example.json`; its scheduled trigger refreshes every 30 minutes. The Sites deployment does not automatically apply this separate Wrangler configuration. A supported scheduler still needs configuration for the existing Sites preview.
5. Maintain the token lifecycle and renew authorization when required. Errors leave the last successful feed intact.

Meta reference: https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/

## Source layout

- `src/server.js`: HTTP API, authorization, stock reservations, image uploads and Instagram reader.
- `src/client.js`: storefront and manager interface; all user-supplied text is escaped before rendering.
- `src/style.css`: responsive gold/marble-inspired styling.
- `assets/`: corrected logo and originally imported public Instagram imagery.
- `drizzle/0000_ridaas_store.sql`: original database schema (already applied on the hosted site; do not reapply as a new migration).
- `build.mjs`: embeds assets, browser code and styling into a standalone Worker entrypoint.
- `tests/`: API and inventory validation.
- `dist/server/index.js`: compiled, deployable application.
- `.openai/hosting.json`: identity and logical storage bindings for the existing Sites deployment.

## Build and bring your own backend

Node.js 20 or later: run `npm run check`, `npm test`, then `npm run build`. Tests additionally need Python 3 with the standard sqlite3 module; set `RIDAAS_PYTHON` to its executable path if `python` is not on your PATH. No runtime packages are required by the application. For production it needs a D1 database bound as `DB`, an R2 bucket bound as `BUCKET`, and a trusted authentication gateway. For a local preview after building, run `node preview-v2.mjs`; it uses a separate local test database and a development-only identity. Never deploy the preview server.

Do not expose this Worker directly while trusting arbitrary `oai-authenticated-user-*` headers: they are only trusted behind Sites dispatch. For your own deployment, implement a verified session or a validated Cloudflare Access JWT in the `admin()` function before enabling administrative access. Set `ADMIN_EMAIL` in your hosting environment, and apply the original schema to a new database before first use. The database starts empty on a fresh host; add your own confirmed products using the manager.

To connect a different backend, implement the API routes called by `src/client.js` or change its `api()` helper to your own same-origin endpoints. Preserve authentication, validation and atomic stock updates. This archive contains source and static assets, not a backup of customer records, uploaded R2 files or hosting secrets.

## Known limits

Inventory is per product, not per size or colour. Request history shows the most recent 200 entries. Instagram account authorization and hosted scheduling remain setup steps. The original Instagram imports were illustrative and some captions/image associations require owner review; verify all products and quantities before opening the site to customers.
