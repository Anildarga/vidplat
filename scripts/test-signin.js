import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testSignIn() {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    console.error('Set TEST_USER_EMAIL and TEST_USER_PASSWORD before running this script.');
    process.exitCode = 1;
    return;
  }

  console.log('🔐 Testing sign-in with verified user...\n');
  console.log('Email:', email);

  // Sign in via credentials (NextAuth signIn endpoint)
  const signInRes = await fetch('http://localhost:3000/api/auth/signin', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, redirect: false }),
    redirect: 'manual'
  });

  console.log('Sign-in response status:', signInRes.status);
  const setCookie = signInRes.headers.get('set-cookie');
  console.log('Set-Cookie:', setCookie ? 'present' : 'absent');

  if (!setCookie) {
    console.log('❌ No session cookie received!');
    return;
  }

  // Extract cookies (simple approach: store for next requests)
  const cookies = setCookie.split(',').map(c => c.split(';')[0].trim());
  const cookieHeader = cookies.join('; ');

  // Check session via API
  console.log('\n📋 Checking session via /api/auth/session...');
  const sessionRes = await fetch('http://localhost:3000/api/auth/session', {
    headers: { Cookie: cookieHeader }
  });
  const session = await sessionRes.json();
  console.log('Session data:', JSON.stringify(session, null, 2));

  const sessionHasEmailVerified = session?.user?.emailVerified;
  console.log('\nsession.user.emailVerified:', sessionHasEmailVerified);

  // Check student page
  console.log('\n📄 Accessing /student page...');
  const pageRes = await fetch('http://localhost:3000/student', {
    headers: { Cookie: cookieHeader }
  });
  console.log('Status:', pageRes.status);
  const html = await pageRes.text();
  const hasBanner = html.includes('EmailVerificationBanner') && html.toLowerCase().includes('verify');
  console.log('Banner detected in HTML?', hasBanner ? 'YES' : 'NO');

  // Check if user is verified in DB
  const user = await prisma.user.findUnique({
    where: { email },
    select: { emailVerified: true, isEmailVerified: true }
  });
  console.log('\nDB - emailVerified:', user?.emailVerified);
  console.log('DB - isEmailVerified:', user?.isEmailVerified);

  const verifiedInDb = !!(user?.emailVerified && user?.isEmailVerified);
  console.log('\n✅ Verdict:');
  console.log('   DB verified:', verifiedInDb ? 'YES' : 'NO');
  console.log('   Session emailVerified:', sessionHasEmailVerified ? 'YES' : 'NO');
  console.log('   Banner shows:', hasBanner ? 'YES' : 'NO');
  console.log('   Expected: Banner should NOT show for verified user');
  if (verifiedInDb && !hasBanner) {
    console.log('   ✅ TEST PASSED');
  } else if (verifiedInDb && hasBanner) {
    console.log('   ❌ TEST FAILED: Banner shows despite verified');
  }
}

testSignIn()
  .catch(e => console.error('Error:', e))
  .finally(() => prisma.$disconnect());
