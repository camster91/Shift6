import express from 'express';
import Stripe from 'stripe';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

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

app.use(cors());
app.use(express.static(join(__dirname, '../dist')));

// Webhook needs raw body
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed':
      const session = event.data.object;
      console.log('Payment successful:', session.id);
      // TODO: Update user subscription in database
      break;
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      const subscription = event.data.object;
      console.log('Subscription updated:', subscription.id, subscription.status);
      // TODO: Update user subscription status
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

app.use(express.json());

// Create checkout session
app.post('/api/create-checkout-session', async (req, res) => {
  const { tier, seats = 1 } = req.body;
  
  if (!PRICES[tier]) {
    return res.status(400).json({ error: 'Invalid pricing tier' });
  }

  try {
    const session = await stripe.checkout.sessions.create({
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
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get subscription status
app.get('/api/subscription/:customerId', async (req, res) => {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: req.params.customerId,
      status: 'active',
      limit: 1
    });
    
    res.json({ 
      active: subscriptions.data.length > 0,
      subscription: subscriptions.data[0] || null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Customer portal
app.post('/api/create-portal-session', async (req, res) => {
  const { customerId } = req.body;
  
  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.APP_URL || 'https://getshift6.com'}/settings`
    });
    
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
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
app.listen(PORT, () => {
  console.log(`Shift6 server running on port ${PORT}`);
});
