# Current Architecture & Security Roadmap

## Current stack

Eduplat is a Next.js 16 App Router application using React 19, TypeScript, MongoDB with Prisma, NextAuth JWT sessions, Stripe payments, Cloudinary media storage, and Brevo transactional email.

The original Phase 2 document described an Express/PostgreSQL/JWT architecture that is no longer used.

## Completed security work

- Quiz answer keys are hidden from students until submission.
- Video progress is server-validated, monotonic, duration-bounded, and completion is derived server-side.
- Paid learning content requires a completed enrollment.
- Pending/failed/cancelled enrollments cannot access protected course content.
- Stripe Checkout webhook writes are idempotent for payments and coupon usage.
- Credentials authentication blocks disabled and unverified accounts.
- OAuth sign-in validates provider email trust and blocks disabled accounts.
- JWT sessions revalidate the current user account status and role.
- Public registration cannot self-assign Instructor/Admin roles.
- Onboarding cannot escalate an account to a privileged role.
- Instructor course-management and learning access is restricted to owned courses.
- Direct video access requires authorization, completed enrollment, and unlock eligibility.
- Public course listings expose published courses only.
- Production email fails closed without Brevo configuration.
- Production uploads require Cloudinary; local filesystem fallback is development-only.
- Uploads are restricted to Instructor/Admin users with bounded file sizes.
- Admin user-management updates are allowlisted and validated.
- Username/password accounts no longer require email OTP verification.
- Email verification and password-reset OTP APIs/UI are temporarily disabled.
- OAuth sign-in still validates provider email trust.

- Monetary inputs are normalized to two-decimal precision.
- Every user can have a role-based identity ID: `stud########`, `inst########`, or `admin########`.
- Admin user lookup is identity-ID based rather than a directory listing.
- Course creation is draft-first with an Add Content menu for videos, notes, quizzes, and documents.
- Instructor publishing requires one-time Admin approval before student visibility; approved courses can be edited without another approval.
- Deleted courses and content are archived in Trash and can be restored by the deleting author or an Admin.
- Video uploads use direct signed Cloudinary upload, with duration taken from uploaded-file metadata.
- YouTube preview parsing supports watch, short, embed, live, and youtu.be URLs.
- Free/paid course price state is validated consistently.
- Quiz scoring honors configured question marks.
- Captured cookies, headers, development logs, and generated certificate artifacts are not kept in the repository.

## Operational verification still required

The remaining validation depends on deployed services and secrets and should be performed in the development/test environment before production release:

1. Run npm install, npx prisma generate, and npm run lint.
2. Run a production build with the required environment variables configured.
3. Exercise Google/GitHub OAuth with real test accounts.
4. Exercise Brevo verification/reset emails.
5. Run Stripe test-mode checkout and resend the same webhook event to confirm idempotency.
6. Upload representative image/video files to Cloudinary and verify playback.
7. Test an Instructor account against another Instructor's course and confirm authorization failures.

## Future improvements

- Move money storage from floating-point database fields to integer minor units after a controlled data migration.
- Add durable global rate limiting at the edge for public endpoints such as contact and authentication flows.
- Consider signed/expiring media URLs or a dedicated video-delivery layer when stronger content protection is required.
- Decompose the large learning-page components as the feature set grows.
