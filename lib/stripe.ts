import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('STRIPE_SECRET_KEY is not defined in environment variables');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
apiVersion: '2026-04-22.dahlia',
});

// Helper to format amount for Stripe (convert to cents)
export function formatAmountForStripe(amount: number, currency: string = 'USD'): number {
  // Stripe amounts are in cents for USD
  const numberFormat = new Intl.NumberFormat(['en-US'], {
    style: 'currency',
    currency,
    currencyDisplay: 'symbol',
  });
  const parts = numberFormat.formatToParts(amount);
  let zeroDecimalCurrency = true;
  
  // Check if currency is zero-decimal
  const zeroDecimalCurrencies = [
    'BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 
    'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 
    'XOF', 'XPF'
  ];
  
  if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
    zeroDecimalCurrency = true;
  } else {
    zeroDecimalCurrency = false;
  }
  
  return zeroDecimalCurrency ? Math.round(amount) : Math.round(amount * 100);
}

// Create checkout session for course enrollment
export async function createCheckoutSession({
  courseId,
  courseTitle,
  amount,
  currency = 'USD',
  userId,
  userEmail,
  successUrl,
  cancelUrl,
  couponCode,
}: {
  courseId: string;
  courseTitle: string;
  amount: number;
  currency?: string;
  userId: string;
  userEmail?: string;
  successUrl: string;
  cancelUrl: string;
  couponCode?: string;
}) {
  const stripeAmount = formatAmountForStripe(amount, currency);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: courseTitle,
            description: `Course enrollment: ${courseTitle}`,
            metadata: {
              courseId,
            },
          },
          unit_amount: stripeAmount,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: successUrl,
    cancel_url: cancelUrl,
    client_reference_id: userId,
    customer_email: userEmail,
    metadata: {
      courseId,
      userId,
      couponCode: couponCode || '',
    },
    payment_intent_data: {
      metadata: {
        courseId,
        userId,
        couponCode: couponCode || '',
      },
    },
  });

  return session;
}

// Verify webhook signature
export function constructEvent(payload: Buffer, signature: string) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  
  if (!webhookSecret) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not defined');
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}