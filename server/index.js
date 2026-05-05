import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { strict: false })
  : null;

const app = express();
app.set('trust proxy', 1);

// ── Middleware ────────────────────────────────────────────────
const allowedOrigins = [
  'https://getshift6.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(null, true);
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));

// Rate limiting
const counts = new Map();
const RATE_WINDOW = 60 * 1000;
const RATE_MAX    = 30;

app.use('/api/', (req, res, next) => {
  const ip   = req.ip || req.connection.remoteAddress;
  const now  = Date.now();
  const rec  = counts.get(ip) || { c: 0, start: now };
  if (now - rec.start > RATE_WINDOW) { rec.c = 1; rec.start = now; }
  else { rec.c++; }
  counts.set(ip, rec);
  if (rec.c > RATE_MAX) return res.status(429).json({ error: 'Too many requests' });
  next();
});

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of counts.entries()) {
    if (now - v.start > RATE_WINDOW * 2) counts.delete(k);
  }
}, RATE_WINDOW);

// ── Static SPA ───────────────────────────────────────────────
app.use(express.static(join(__dirname, '../dist')));
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

// ── Health check ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Stripe webhook (raw body, must be before json()) ──────────
app.post('/api/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    if (!stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      return res.status(503).send('Stripe not configured');
    }
    const sig = req.headers['stripe-signature'];
    let event;
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case 'checkout.session.completed': {
          const s     = event.data.object;
          const email = s.customer_details?.email;
          if (!email) break;
          // TODO: upsertUser + upsertSubscription via db.js when DB is wired
          console.log('checkout.completed:', email, s.id);
          break;
        }
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted': {
          const sub = event.data.object;
          console.log('subscription', sub.status, sub.id);
          break;
        }
        default:
          console.log(`Unhandled event type: ${event.type}`);
      }
    } catch (err) {
      console.error(`Error handling ${event.type}:`, err);
    }
    res.json({ received: true });
  }
);

// ── Stripe API routes ─────────────────────────────────────────
const PRICES = {
  pro:  { amount: 1500, interval: 'month', name: 'Pro' },
  team: { amount: 2500, interval: 'month', name: 'Team' },
};

app.post('/api/create-checkout-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const { tier, seats = 1, email } = req.body;
  if (!PRICES[tier]) return res.status(400).json({ error: 'Invalid tier' });

  try {
    const session = await stripe.checkout.sessions.create({
      customer_email:  email || undefined,
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `Shift6 ${PRICES[tier].name}` },
          unit_amount: PRICES[tier].amount,
          recurring:   { interval: PRICES[tier].interval },
        },
        quantity: tier === 'team' ? seats : 1,
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${process.env.APP_URL}/pricing`,
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/subscription/:customerId', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  try {
    const subs = await stripe.subscriptions.list({ customer: req.params.customerId, status: 'active', limit: 1 });
    res.json({ active: subs.data.length > 0, subscription: subs.data[0] || null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/create-portal-session', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  try {
    const sess = await stripe.billingPortal.sessions.create({
      customer: req.body.customerId,
      return_url: `${process.env.APP_URL}/settings`,
    });
    res.json({ url: sess.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Start ────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Shift6 server running on port ${PORT} (Stripe ${stripe ? 'enabled' : 'disabled'})`);
});