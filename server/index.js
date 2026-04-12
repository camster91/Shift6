import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Validate required environment variables at startup
const requiredEnvVars = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    console.error(`FATAL: Missing required environment variable: ${varName}`);
    process.exit(1);
  }
}

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Trust proxy for correct client IPs (running behind Coolify/nginx)
app.set('trust proxy', 1);

// Pricing tiers
const PRICES = {
  pro: {
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    name: 'Pro',
    amount: 1500, // $15/month
    interval: 'month'
  },
  team: {
    priceId: process.env.STRIPE_TEAM_PRICE_ID,
    name: 'Team',
    amount: 2500, // $25/seat/month
    interval: 'month'
  }
};

// Restrict CORS to known origins
const allowedOrigins = [
  'https://getshift6.com',
  'http://localhost:5173', // Local development
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(null, true); // Allow all for now; tighten in production
  },
  credentials: true,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.static(join(__dirname, '../dist')));

// Simple rate limiting (in-memory, per-IP)
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 30;

app.use('/api/', (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const record = requestCounts.get(ip) || { count: 0, start: now };

  if (now - record.start > RATE_LIMIT_WINDOW) {
    record.count = 1;
    record.start = now;
  } else {
    record.count++;
  }

  requestCounts.set(ip, record);

  if (record.count > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  }

  next();
});

// Clean up rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of requestCounts.entries()) {
    if (now - record.start > RATE_LIMIT_WINDOW * 2) {
      requestCounts.delete(ip);
    }
  }
}, RATE_LIMIT_WINDOW);

// Webhook needs raw body
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).send('Missing stripe-signature header');
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook verification failed:', err.message);
    return res.status(400).send('Webhook verification failed');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      console.log('Payment successful:', session.id, 'customer:', session.customer);
      break;
    }
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id, subscription.status);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { tier, seats = 1, customerEmail } = req.body;

  if (!PRICES[tier]) {
    return res.status(400).json({ error: 'Invalid pricing tier' });
  }

  // Validate seats
  if (!Number.isInteger(seats) || seats < 1 || seats > 100) {
    return res.status(400).json({ error: 'Invalid seat count. Must be between 1 and 100.' });
  }

  try {
    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `Shift6 ${PRICES[tier].name}`,
            description: tier === 'team' ? `${seats} seat(s)` : 'Unlimited projects'
          },
          unit_amount: PRICES[tier].amount,
          recurring: {
            interval: PRICES[tier].interval
          }
        },
        quantity: tier === 'team' ? seats : 1
      }],
      mode: 'subscription',
      success_url: `${process.env.APP_URL || 'https://getshift6.com'}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.APP_URL || 'https://getshift6.com'}/pricing`
    };

    // Associate customer if email provided
    if (customerEmail && typeof customerEmail === 'string') {
      sessionConfig.customer_email = customerEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    res.json({ url: session.url, sessionId: session.id });
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Get subscription status
app.get('/api/subscription/:customerId', async (req, res) => {
  const { customerId } = req.params;

  // Validate customerId format (Stripe customer IDs start with cus_)
  if (!customerId || !customerId.startsWith('cus_')) {
    return res.status(400).json({ error: 'Invalid customer ID format' });
  }

  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      limit: 1
    });

    res.json({
      active: subscriptions.data.length > 0,
      subscription: subscriptions.data[0] || null
    });
  } catch (error) {
    console.error('Subscription lookup error:', error);
    res.status(500).json({ error: 'Failed to retrieve subscription status' });
  }
});

// Customer portal
app.post('/api/create-portal-session', async (req, res) => {
  const { customerId } = req.body;

  // Validate customerId format
  if (!customerId || !customerId.startsWith('cus_')) {
    return res.status(400).json({ error: 'Invalid customer ID format' });
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL || 'https://getshift6.com'}/settings`
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Portal session error:', error);
    res.status(500).json({ error: 'Failed to create portal session' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, '../dist/index.html'));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Shift6 server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});