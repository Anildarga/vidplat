# Eduplat Setup Guide

## Stack

Eduplat is a Next.js 16 App Router application using React 19, TypeScript, MongoDB with Prisma, NextAuth JWT sessions, Stripe for payments, Cloudinary for media, and Brevo for production email delivery.

## Environment

Create a local `.env` file and configure the values documented in `README.md`. Never commit credentials, captured cookies, session tokens, API keys, or local request/response logs.

For production, configure at minimum:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` when Google login is enabled
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` when GitHub login is enabled
- `BREVO_API_KEY` and sender settings
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`

## Database

Run `npm install`, then `npx prisma generate` and `npx prisma db push` against a separate development MongoDB database.

## Run locally

Run `npm run dev`. The app normally starts at `http://localhost:3000`.

## Production deployment

Deploy to Vercel or another Next.js-compatible host and configure environment variables in the hosting platform. Production uploads require Cloudinary; the app does not fall back to local filesystem storage in production.

Stripe webhooks must target `/api/stripe/webhook` and use the configured webhook signing secret.

## Security checks

Before release, verify that unverified credential users cannot sign in, disabled users lose protected-session access, public registration cannot create Instructor/Admin accounts, instructors cannot access another instructor's course-management or learning content, paid courses reject PENDING/FAILED/CANCELLED enrollments, quiz answers are hidden before submission, repeated Stripe webhooks do not duplicate payments or coupon usage, production email fails closed without Brevo, production uploads require Cloudinary, and no captured cookies, headers, logs, secrets, or real credentials are committed.
