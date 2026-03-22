import React, { useState } from 'react';
import { Check, Zap, Users, Crown } from 'lucide-react';

const PricingTier = ({ name, price, period, features, cta, popular, onSelect, loading }) => (
  <div className={`relative rounded-2xl p-8 ${popular ? 'bg-blue-600 text-white ring-4 ring-blue-600' : 'bg-white border border-gray-200'}`}>
    {popular && (
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-yellow-400 text-gray-900 text-sm font-semibold px-4 py-1 rounded-full">
        Most Popular
      </div>
    )}
    <h3 className={`text-xl font-bold ${popular ? 'text-white' : 'text-gray-900'}`}>{name}</h3>
    <div className="mt-4 flex items-baseline">
      <span className="text-4xl font-extrabold">${price}</span>
      <span className={`ml-2 ${popular ? 'text-blue-100' : 'text-gray-500'}`}>/{period}</span>
    </div>
    <ul className="mt-6 space-y-3">
      {features.map((feature, i) => (
        <li key={i} className="flex items-center">
          <Check className={`w-5 h-5 mr-3 ${popular ? 'text-blue-200' : 'text-green-500'}`} />
          <span className={popular ? 'text-blue-100' : 'text-gray-600'}>{feature}</span>
        </li>
      ))}
    </ul>
    <button
      onClick={onSelect}
      disabled={loading}
      className={`mt-8 w-full py-3 px-6 rounded-lg font-semibold transition ${
        popular
          ? 'bg-white text-blue-600 hover:bg-blue-50'
          : 'bg-blue-600 text-white hover:bg-blue-700'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? 'Loading...' : cta}
    </button>
  </div>
);

export default function Pricing() {
  const [loading, setLoading] = useState(null);
  const [seats, setSeats] = useState(5);

  const handleCheckout = async (tier) => {
    setLoading(tier);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier, seats: tier === 'team' ? seats : 1 })
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert('Error creating checkout session');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Error connecting to payment server');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-16 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Start free, upgrade when you need more power
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingTier
            name="Free"
            price="0"
            period="forever"
            features={[
              'Up to 3 projects',
              '2 team members',
              'Basic task management',
              'Calendar view',
              'Community support'
            ]}
            cta="Get Started"
            onSelect={() => window.location.href = '/'}
          />

          <PricingTier
            name="Pro"
            price="15"
            period="month"
            popular
            features={[
              'Unlimited projects',
              '10 team members',
              'Advanced analytics',
              'Time tracking',
              'Priority support',
              'Custom workflows'
            ]}
            cta="Start Pro Trial"
            onSelect={() => handleCheckout('pro')}
            loading={loading === 'pro'}
          />

          <div className="relative rounded-2xl p-8 bg-white border border-gray-200">
            <h3 className="text-xl font-bold text-gray-900">Team</h3>
            <div className="mt-4 flex items-baseline">
              <span className="text-4xl font-extrabold">${25 * seats}</span>
              <span className="ml-2 text-gray-500">/month</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-gray-500">$25/seat ×</span>
              <input
                type="number"
                min="1"
                max="100"
                value={seats}
                onChange={(e) => setSeats(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-16 px-2 py-1 border rounded text-center"
              />
              <span className="text-sm text-gray-500">seats</span>
            </div>
            <ul className="mt-6 space-y-3">
              {[
                'Everything in Pro',
                'Unlimited team members',
                'SSO & SAML',
                'Admin controls',
                'Audit logs',
                'Dedicated support',
                'Custom integrations'
              ].map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Check className="w-5 h-5 mr-3 text-green-500" />
                  <span className="text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleCheckout('team')}
              disabled={loading === 'team'}
              className="mt-8 w-full py-3 px-6 rounded-lg font-semibold bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-50"
            >
              {loading === 'team' ? 'Loading...' : 'Start Team Trial'}
            </button>
          </div>
        </div>

        <div className="mt-16 text-center">
          <p className="text-gray-600">
            All plans include a 14-day free trial. No credit card required to start.
          </p>
        </div>
      </div>
    </div>
  );
}
