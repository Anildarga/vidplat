import { NextRequest, NextResponse } from 'next/server';
import { constructEvent } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('stripe-signature') || '';

  try {
    const event = constructEvent(Buffer.from(payload), signature);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get enrollment by session ID with needed fields
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            stripeSessionId: session.id,
          },
          select: {
            id: true,
            userId: true,
            courseId: true,
            finalPrice: true,
            discountApplied: true,
            couponId: true,
          },
        });

        if (enrollment) {
          // Get course for currency
          const course = await prisma.course.findUnique({
            where: { id: enrollment.courseId },
            select: { currency: true },
          });

          // Update enrollment payment status
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
              paymentStatus: 'COMPLETED',
              paidAt: new Date(),
              stripePaymentId: session.payment_intent as string,
            },
          });

          // Create payment record
          await prisma.payment.create({
            data: {
              enrollmentId: enrollment.id,
              stripePaymentId: session.payment_intent as string,
              stripeSessionId: session.id,
              amount: enrollment.finalPrice,
              currency: course?.currency || 'USD',
              status: 'COMPLETED',
              metadata: session.metadata || {},
            },
          });

          // Create coupon usage record if coupon was used
          const couponCode = session.metadata?.couponCode;
          if (couponCode && couponCode.trim() !== '' && enrollment.couponId) {
            await prisma.couponUsage.create({
              data: {
                couponId: enrollment.couponId,
                userId: enrollment.userId,
                courseId: enrollment.courseId,
                discountApplied: enrollment.discountApplied,
              },
            });
          }

          console.log(`Payment completed for enrollment ${enrollment.id}`);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Update enrollment to cancelled/expired
        await prisma.enrollment.updateMany({
          where: {
            stripeSessionId: session.id,
            paymentStatus: 'PENDING',
          },
          data: {
            paymentStatus: 'CANCELLED',
          },
        });
        
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`PaymentIntent ${paymentIntent.id} was successful!`);
        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Find enrollment by payment intent ID
        const enrollment = await prisma.enrollment.findFirst({
          where: {
            stripePaymentId: paymentIntent.id,
          },
        });

        if (enrollment) {
          await prisma.enrollment.update({
            where: { id: enrollment.id },
            data: {
              paymentStatus: 'FAILED',
            },
          });

          await prisma.payment.updateMany({
            where: {
              stripePaymentId: paymentIntent.id,
            },
            data: {
              status: 'FAILED',
            },
          });
        }
        
        console.log(`Payment failed for ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}

// // Configure to use raw body
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };