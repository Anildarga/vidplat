const Stripe = require('stripe');
require('dotenv').config({ path: '.env' });

async function testStripe() {
  console.log('Testing Stripe configuration...');
  
  // Check environment variables
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
  
  console.log('STRIPE_SECRET_KEY:', stripeSecretKey ? '***' + stripeSecretKey.slice(-4) : 'Not set');
  console.log('STRIPE_PUBLISHABLE_KEY:', stripePublishableKey ? '***' + stripePublishableKey.slice(-4) : 'Not set');
  
  if (!stripeSecretKey) {
    console.error('❌ STRIPE_SECRET_KEY is not set in environment variables');
    return;
  }
  
  if (!stripePublishableKey) {
    console.warn('⚠️ STRIPE_PUBLISHABLE_KEY is not set in environment variables');
  }
  
  console.log('✅ Stripe environment variables found');
  
  // Test Stripe API connection
  try {
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-02-24.acacia',
    });
    
    // Try to list a few products to verify connection
    const products = await stripe.products.list({ limit: 3 });
    console.log(`✅ Stripe API connection successful. Found ${products.data.length} products.`);
    
    // Test creating a checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Test Product',
            },
            unit_amount: 1000, // $10.00
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: 'https://example.com/success',
      cancel_url: 'https://example.com/cancel',
    });
    
    console.log(`✅ Test checkout session created: ${session.id}`);
    console.log(`✅ Session URL: ${session.url}`);
    
  } catch (error) {
    console.error('❌ Stripe API error:', error.message);
  }
}

// Run the test
testStripe().catch(console.error);