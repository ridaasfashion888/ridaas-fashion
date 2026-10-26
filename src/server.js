const ASSETS = {};
const CLIENT = '';
const STYLES = '';

const defaults = {
  name: 'Ridaas Fashion',
  headline: 'Tradition, cut differently.',
  intro: 'Ethnic elegance. Contemporary spirit. Custom designs and quality stitching from our boutique in Salem.',
  location: 'Salem, Tamil Nadu',
  instagram: 'https://www.instagram.com/_ridaas_/',
  logo: '/assets/ridaas-fashion-logo.png',
  announcement: 'Custom designs • Quality stitching • Salem, Tamil Nadu'
};

const reply = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    }
  });

function fail(message, status = 400) {
  throw Object.assign(new Error(message), { status });
}

function text(value, max = 500) {
  return String(value ?? '').trim().slice(0, max);
}

function imageURL(value) {
  const s = text(value, 2000);

  if (
    s &&
    !/^\/assets\/[\w.-]+$|^\/media\/products\/[\w.-]+$|^https:\/\//.test(s)
  ) {
    fail('Use an uploaded image or an HTTPS image address.');
  }

  return s;
}

/* =========================
   SETTINGS
========================= */

async function setting(env, key, fallback) {
  const row = await env.DB
    .prepare('SELECT value FROM settings WHERE key=?')
    .bind(key)
    .first();

  if (!row || !row.value) {
    return fallback;
  }

  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

async function saveSetting(env, key, value) {
  await env.DB
    .prepare(`
      INSERT INTO settings(key, value)
      VALUES(?, ?)
      ON CONFLICT(key)
      DO UPDATE SET value=excluded.value
    `)
    .bind(key, JSON.stringify(value))
    .run();
}

/* =========================
   ADMIN AUTH
========================= */

function admin(req, env) {
  const hostname = new URL(req.url).hostname;

  // Local development only.
  // This does NOT bypass authentication on the live website.
  if (
    env.LOCAL_ADMIN === 'true' &&
    (hostname === 'localhost' || hostname === '127.0.0.1')
  ) {
    return;
  }

  const email = req.headers.get('oai-authenticated-user-email');
  const id = req.headers.get('oai-authenticated-user-id');

  if (!id || !email) {
    fail('Sign in with the store owner account to continue.', 401);
  }

  if (
    !env.ADMIN_EMAIL ||
    email.toLowerCase() !== env.ADMIN_EMAIL.toLowerCase()
  ) {
    fail('This account does not have store management access.', 403);
  }
}

/* =========================
   PRODUCT VALIDATION
========================= */

function product(input) {
  const p = {
    name: text(input.name, 120),
    category: text(input.category, 80),
    description: text(input.description, 1000),
    price_paise: Number(input.price_paise),
    price_label: text(input.price_label, 40),
    image_url: imageURL(input.image_url),
    sizes: text(input.sizes, 200),
    stock: Number(input.stock),
    status: text(input.status, 20),
    featured: input.featured ? 1 : 0
  };

  if (!p.name) {
    fail('Product name is required.');
  }

  if (!p.category) {
    fail('Product category is required.');
  }

  if (!Number.isSafeInteger(p.price_paise) || p.price_paise < 0) {
    fail('Enter a valid product price.');
  }

  if (!p.price_label) {
    p.price_label = `₹${(p.price_paise / 100).toLocaleString('en-IN')}`;
  }

  if (!Number.isSafeInteger(p.stock) || p.stock < 0) {
    fail('Enter a valid stock quantity.');
  }

  if (!['active', 'draft', 'archived'].includes(p.status)) {
    fail('Invalid product status.');
  }

  if (p.status === 'active' && !p.image_url) {
    fail('Active products need an image.');
  }

  return p;
}

/* =========================
   INSTAGRAM
========================= */

async function syncInstagram(env) {
  if (
    !env.INSTAGRAM_ACCESS_TOKEN ||
    !env.INSTAGRAM_USER_ID ||
    !env.INSTAGRAM_API_VERSION
  ) {
    fail('Instagram is not connected.', 400);
  }

  /*
   * Instagram syncing can be connected later.
   * For now, preserve the existing feed if one exists.
   */
  const current = await setting(env, 'instagram_feed', {
    posts: [],
    syncedAt: null
  });

  return current;
}

/* =========================
   API
========================= */

async function api(req, env, url) {
  const path = url.pathname;
  const method = req.method;

  if (path.startsWith('/api/admin/')) {
    admin(req, env);
  }

  if (!['GET', 'HEAD'].includes(method)) {
    if (req.headers.get('origin') !== url.origin) {
      fail('Request origin could not be verified.', 403);
    }

    if (Number(req.headers.get('content-length') || 0) > 9000000) {
      fail('Upload is too large.', 413);
    }
  }

  /* Store */

  if (path === '/api/store' && method === 'GET') {
    const settings = await setting(env, 'branding', defaults);

    const { results } = await env.DB
      .prepare(
        "SELECT * FROM products WHERE status='active' ORDER BY featured DESC,id DESC"
      )
      .all();

    return reply({
      settings: {
        ...defaults,
        ...settings
      },
      products: results
    });
  }

  /* Instagram */

  if (path === '/api/instagram' && method === 'GET') {
    return reply(
      await setting(env, 'instagram_feed', {
        posts: [],
        syncedAt: null
      })
    );
  }

  if (path === '/api/admin/instagram' && method === 'GET') {
    return reply({
      connected: Boolean(
        env.INSTAGRAM_ACCESS_TOKEN &&
        env.INSTAGRAM_USER_ID &&
        env.INSTAGRAM_API_VERSION
      ),
      ...(await setting(env, 'instagram_feed', {
        posts: [],
        syncedAt: null
      }))
    });
  }

  if (path === '/api/admin/instagram/sync' && method === 'POST') {
    return reply(await syncInstagram(env));
  }

  /* Admin dashboard */

  if (path === '/api/admin/dashboard' && method === 'GET') {
    const [products, orders, branding] = await Promise.all([
      env.DB
        .prepare('SELECT * FROM products ORDER BY id DESC')
        .all(),

      env.DB
        .prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200')
        .all(),

      setting(env, 'branding', defaults)
    ]);

    return reply({
      products: products.results,
      orders: orders.results,
      settings: {
        ...defaults,
        ...branding
      }
    });
  }

  /* Branding */

  if (path === '/api/admin/branding' && method === 'PUT') {
    const b = await req.json();

    const data = {
      name: text(b.name, 80),
      headline: text(b.headline, 120),
      intro: text(b.intro, 500),
      location: text(b.location, 200),
      instagram: text(b.instagram, 300),
      logo: imageURL(b.logo),
      announcement: text(b.announcement, 160)
    };

    if (!data.name || !data.headline) {
      fail('Store name and headline are required.');
    }

    if (
      !/^https:\/\/(www\.)?instagram\.com\/[\w.]+\/?$/.test(
        data.instagram
      )
    ) {
      fail('Enter your Instagram profile address.');
    }

    await saveSetting(env, 'branding', data);

    return reply({ ok: true });
  }

  /* Product image upload */

  if (path === '/api/admin/upload' && method === 'POST') {
    const form = await req.formData();
    const file = form.get('file');

    if (
      !file ||
      typeof file.arrayBuffer !== 'function' ||
      file.size > 8000000
    ) {
      fail('Choose an image smaller than 8 MB.');
    }

    const bytes = new Uint8Array(await file.arrayBuffer());

    let ext = '';
    let mime = '';

    if (
      bytes[0] === 137 &&
      bytes[1] === 80 &&
      bytes[2] === 78 &&
      bytes[3] === 71
    ) {
      ext = 'png';
      mime = 'image/png';
    } else if (
      bytes[0] === 255 &&
      bytes[1] === 216 &&
      bytes[2] === 255
    ) {
      ext = 'jpg';
      mime = 'image/jpeg';
    } else if (
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'
    ) {
      ext = 'webp';
      mime = 'image/webp';
    } else {
      fail('Use a PNG, JPG or WebP image.');
    }

    const key = `products/${crypto.randomUUID()}.${ext}`;

    await env.BUCKET.put(key, bytes, {
      httpMetadata: {
        contentType: mime
      }
    });

    return reply(
      {
        url: `/media/${key}`
      },
      201
    );
  }

  /* Products */

  const pm = path.match(/^\/api\/admin\/products(?:\/(\d+))?$/);

  if (pm && ['POST', 'PUT'].includes(method)) {
    const p = product(await req.json());
    const values = Object.values(p);

    if (method === 'PUT') {
      if (!pm[1]) {
        fail('Product ID required');
      }

      const result = await env.DB
        .prepare(`
          UPDATE products
          SET
            name=?,
            category=?,
            description=?,
            price_paise=?,
            price_label=?,
            image_url=?,
            sizes=?,
            stock=?,
            status=?,
            featured=?,
            updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `)
        .bind(...values, Number(pm[1]))
        .run();

      if (!result.meta.changes) {
        fail('Product not found.', 404);
      }
    } else {
      await env.DB
        .prepare(`
          INSERT INTO products(
            name,
            category,
            description,
            price_paise,
            price_label,
            image_url,
            sizes,
            stock,
            status,
            featured,
            slug
          )
          VALUES(?,?,?,?,?,?,?,?,?,?,?)
        `)
        .bind(
          ...values,
          crypto.randomUUID()
        )
        .run();
    }

    return reply({ ok: true });
  }

  /* Customer orders */

  if (path === '/api/orders' && method === 'POST') {
    const o = await req.json();

    if (
      !text(o.customer_name, 120) ||
      !/^\+?[\d ()-]{7,25}$/.test(o.phone || '')
    ) {
      fail('Enter your name and a valid phone number.');
    }

    if (!/^[a-f0-9-]{36}$/.test(o.request_id || '')) {
      fail('Please refresh the order form.');
    }

    if (
      !Array.isArray(o.items) ||
      !o.items.length ||
      o.items.length > 30
    ) {
      fail('Select between 1 and 30 products.');
    }

    const items = o.items.map(i => ({
      id: Number(i.id),
      quantity: Number(i.quantity),
      size: text(i.size, 80)
    }));

    if (
      items.some(
        i =>
          !Number.isSafeInteger(i.id) ||
          i.id < 1 ||
          !Number.isSafeInteger(i.quantity) ||
          i.quantity < 1 ||
          i.quantity > 10
      ) ||
      new Set(items.map(i => i.id)).size !== items.length
    ) {
      fail('Check product quantities.');
    }

    const number = `RID-${o.request_id}`;

    const existing = await env.DB
      .prepare('SELECT order_number FROM orders WHERE order_number=?')
      .bind(number)
      .first();

    if (existing) {
      return reply({
        ok: true,
        order_number: number
      });
    }

    const rows = await env.DB
      .prepare(
        `SELECT * FROM products
         WHERE id IN (${items.map(() => '?').join(',')})
         AND status='active'`
      )
      .bind(...items.map(i => i.id))
      .all();

    if (rows.results.length !== items.length) {
      fail(
        'One of these products is no longer available.',
        409
      );
    }

    const safe = items.map(i => {
      const p = rows.results.find(p => p.id === i.id);

      return {
        ...i,
        name: p.name,
        price_paise: p.price_paise
      };
    });

    const data = JSON.stringify(safe);

    const total = safe.reduce(
      (sum, item) =>
        sum + item.quantity * item.price_paise,
      0
    );

    const results = await env.DB.batch([
      env.DB
        .prepare(`
          INSERT OR IGNORE INTO orders(
            order_number,
            customer_name,
            phone,
            email,
            city,
            notes,
            items_json,
            total_paise
          )
          SELECT ?,?,?,?,?,?,?,?
          WHERE NOT EXISTS (
            SELECT 1
            FROM json_each(?) j
            LEFT JOIN products p
              ON p.id=json_extract(j.value,'$.id')
            WHERE
              p.id IS NULL
              OR p.status!='active'
              OR p.stock<json_extract(j.value,'$.quantity')
          )
        `)
        .bind(
          number,
          text(o.customer_name, 120),
          text(o.phone, 30),
          text(o.email, 160),
          text(o.city, 100),
          text(o.notes, 1000),
          data,
          total,
          data
        ),

      env.DB
        .prepare(`
          UPDATE products
          SET
            stock=stock-(
              SELECT json_extract(j.value,'$.quantity')
              FROM json_each(?) j
              WHERE json_extract(j.value,'$.id')=products.id
            ),
            updated_at=CURRENT_TIMESTAMP
          WHERE changes()>0
            AND id IN (
              SELECT json_extract(value,'$.id')
              FROM json_each(?)
            )
        `)
        .bind(data, data)
    ]);

    if (!results[0].meta.changes) {
      const saved = await env.DB
        .prepare(
          'SELECT order_number FROM orders WHERE order_number=?'
        )
        .bind(number)
        .first();

      if (!saved) {
        fail(
          'The requested quantity is no longer available. Refresh the collection and try again.',
          409
        );
      }
    }

    return reply(
      {
        ok: true,
        order_number: number
      },
      201
    );
  }

  /* Admin order status */

  const om = path.match(/^\/api\/admin\/orders\/(\d+)$/);

  if (om && method === 'PUT') {
    const { status } = await req.json();

    if (
      ![
        'new',
        'confirmed',
        'stitching',
        'ready',
        'shipped',
        'complete',
        'cancelled'
      ].includes(status)
    ) {
      fail('Invalid status');
    }

    const order = await env.DB
      .prepare('SELECT * FROM orders WHERE id=?')
      .bind(Number(om[1]))
      .first();

    if (!order) {
      fail('Order not found', 404);
    }

    if (
      order.status === 'cancelled' &&
      status !== 'cancelled'
    ) {
      fail(
        'Cancelled requests cannot be reopened. Create a new request.'
      );
    }

    if (
      status === 'cancelled' &&
      /^RID-[a-f0-9-]{36}$/.test(order.order_number)
    ) {
      await env.DB.batch([
        env.DB
          .prepare(`
            UPDATE orders
            SET status='cancelled',
                updated_at=CURRENT_TIMESTAMP
            WHERE id=?
              AND status!='cancelled'
          `)
          .bind(order.id),

        env.DB
          .prepare(`
            UPDATE products
            SET stock=stock+
              COALESCE(
                (
                  SELECT json_extract(value,'$.quantity')
                  FROM json_each(?)
                  WHERE json_extract(value,'$.id')=products.id
                ),
                0
              )
            WHERE changes()>0
              AND id IN (
                SELECT json_extract(value,'$.id')
                FROM json_each(?)
              )
          `)
          .bind(
            order.items_json,
            order.items_json
          )
      ]);
    } else {
      await env.DB
        .prepare(`
          UPDATE orders
          SET status=?,
              updated_at=CURRENT_TIMESTAMP
          WHERE id=?
        `)
        .bind(status, order.id)
        .run();
    }

    return reply({ ok: true });
  }

  fail('Not found', 404);
}

/* =========================
   HTML
========================= */

function html(isAdmin) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Ridaas Fashion${isAdmin ? ' • Store manager' : ' • Boutique clothing'}</title>
<meta
  name="description"
  content="Ridaas Fashion — ethnic and contemporary clothing, custom designs and quality stitching in Salem."
>
<link rel="icon" href="/assets/ridaas-fashion-logo.png">
<link rel="stylesheet" href="/style.css">
</head>
<body data-admin="${isAdmin}">
<div id="app">
  <p class="loading">Opening Ridaas Fashion…</p>
</div>
<div id="notice" role="status" aria-live="polite"></div>
<script src="/client.js" defer></script>
</body>
</html>`;
}

/* =========================
   WORKER
========================= */

export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    try {
      if (url.pathname.startsWith('/assets/')) {
        const asset = ASSETS[url.pathname.slice(8)];

        if (!asset) {
          fail('Not found', 404);
        }

        return new Response(
          Uint8Array.from(
            atob(asset.base64),
            c => c.charCodeAt(0)
          ),
          {
            headers: {
              'content-type': asset.type,
              'cache-control': 'public,max-age=86400',
              'x-content-type-options': 'nosniff'
            }
          }
        );
      }

      if (url.pathname === '/client.js') {
        return new Response(CLIENT, {
          headers: {
            'content-type': 'text/javascript'
          }
        });
      }

      if (url.pathname === '/style.css') {
        return new Response(STYLES, {
          headers: {
            'content-type': 'text/css'
          }
        });
      }

      if (url.pathname.startsWith('/media/')) {
        const obj = await env.BUCKET.get(
          url.pathname.slice(7)
        );

        if (!obj) {
          fail('Not found', 404);
        }

        const headers = new Headers({
          'x-content-type-options': 'nosniff',
          'cache-control': 'public,max-age=86400'
        });

        obj.writeHttpMetadata(headers);

        return new Response(obj.body, {
          headers
        });
      }

      if (url.pathname.startsWith('/api/')) {
        return await api(req, env, url);
      }

      if (!['/', '/admin', '/admin/'].includes(url.pathname)) {
        fail('Not found', 404);
      }

      return new Response(
        html(url.pathname.startsWith('/admin')),
        {
          headers: {
            'content-type': 'text/html; charset=utf-8',
            'cache-control': 'no-store',
            'content-security-policy':
              "default-src 'self'; img-src 'self' https: data:; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com",
            'x-content-type-options': 'nosniff',
            'referrer-policy': 'strict-origin-when-cross-origin'
          }
        }
      );
    } catch (e) {
      console.error(
        'Request failed',
        url.pathname,
        e.status || 500,
        e
      );

      return reply(
        {
          error: e.status
            ? e.message
            : 'The store is temporarily unavailable. Your changes were not confirmed; please try again.'
        },
        e.status || 500
      );
    }
  },

  async scheduled(event, env, ctx) {
    ctx.waitUntil(
      syncInstagram(env).catch(() =>
        console.error(
          'Instagram refresh failed; check connection settings.'
        )
      )
    );
  }
};