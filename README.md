# EduPlat - Educational Platform

A modern, full-featured educational platform built with Next.js 16, MongoDB, and Prisma. This platform supports course creation, video management, quizzes, user authentication, and role-based access control (student, instructor, admin).

## Features

- **User Authentication**: Username/password, Google OAuth, GitHub OAuth with NextAuth.js
- **Role-Based Access**: Student, Instructor, and Admin roles with unique identity IDs (`stud########`, `inst########`, `admin########`)
- **Course Management**: Create, edit, publish, admin approval, and trash-based recovery
- **Video Management**: Upload, reorder, edit, and delete videos within courses
- **Quiz System**: Create quizzes with multiple-choice questions, track results
- **Progress Tracking**: Track video watch progress and quiz completion
- **Certificate Generation**: Generate certificates upon course completion
- **Responsive UI**: Built with Tailwind CSS, fully responsive
- **Course Content**: Videos, notes, quizzes, and documents (PDF, PPT, DOC, Excel, and other files)
- **Email Notifications**: Password reset, email verification, and welcome emails via Brevo in production (Ethereal/Nodemailer in development)

## Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, NextAuth.js
- **Database**: MongoDB (via Prisma ORM)
- **Authentication**: NextAuth.js (JWT sessions)
- **Email**: Brevo in production when enabled, Ethereal/Nodemailer in development
- **Deployment**: Vercel (recommended)

## Prerequisites

- Node.js 20+ and npm/yarn/pnpm/bun
- MongoDB Atlas account (or local MongoDB)
- Google OAuth credentials (for Google login)
- GitHub OAuth credentials (for GitHub login)
- Resend API key (for email functionality)

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/Anildarga/vidplat.git
cd eduplat
```

### 2. Install dependencies

```bash
npm install
# or
yarn install
# or
pnpm install
# or
bun install
```

### 3. Set up environment variables

Create a local `.env` file from `.env.example`. Never commit secrets; add production values through your hosting provider.

```env
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/eduplat?retryWrites=true&w=majority"

# NextAuth
NEXTAUTH_SECRET="replace-with-a-random-32-character-secret"
NEXTAUTH_URL="http://localhost:3000"

# OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
GITHUB_CLIENT_ID=""
GITHUB_CLIENT_SECRET=""

# App
FRONTEND_URL="http://localhost:3000"

# Email
BREVO_API_KEY=""
BREVO_FROM_EMAIL="noreply@example.com"
BREVO_FROM_NAME="Eduplat"

# Stripe
STRIPE_SECRET_KEY=""
STRIPE_WEBHOOK_SECRET=""

# Cloudinary
CLOUDINARY_CLOUD_NAME=""
CLOUDINARY_API_KEY=""
CLOUDINARY_API_SECRET=""
```

**Important**: Replace all placeholder values with your actual credentials. The existing `.env` file already contains sample values that you must update.

### 4. Set up the database

This project uses MongoDB with Prisma. Ensure your `DATABASE_URL` points to a valid MongoDB instance (MongoDB Atlas recommended).

#### Install Prisma CLI and client (if not already installed)

The project uses Prisma ORM. If you haven't installed Prisma globally, you can use `npx`:

```bash
npx prisma generate
npx prisma db push
```

If you encounter file lock errors on Windows, close all Node processes and delete `node_modules/.prisma/client` before retrying.

### 5. Seed the database with test data (optional)

Run the seed script to create test users, courses, and videos:

```bash
node prisma/seed.js
```

Alternatively, if you have `tsx` installed, you can run the TypeScript seed:

```bash
npx tsx prisma/seed.ts
```

**Note**: The seed script requires `bcryptjs` and `@prisma/client`. Ensure these dependencies are installed (they are included in the project).

### 6. Run the development server

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Development test data

The seed script creates development users and content for local testing. Do not reuse development passwords in production.

| Role       | Email                   | Password    |
|------------|-------------------------|-------------|
| Instructor | `instructor@test.com`   | `password123` |
| Admin      | `admin@test.com`        | `admin123`    |
| Student    | `student@test.com`      | `student123`  |

## Current account and course workflow

Local signup uses only First name, Last name, Username, and Password. Username is unique. Login uses Username/Password or Google/GitHub. Email OTP verification and password-reset OTP flows are currently disabled.

Each account has a unique role-based identity ID:
- Student: `stud` + 8 digits
- Instructor: `inst` + 8 digits
- Admin: `admin` + 8 digits

Admin user lookup is performed by identity ID rather than by browsing the full user directory.

Course authors create a course first, then use **Add Content** to add videos, notes, quizzes, and documents. Publishing marks the course as author-published. Instructor-created courses remain hidden from students until an Admin approves them. After approval, instructors can edit course details and content without another approval cycle.

Deleted courses and course content are archived in Trash before removal and can be restored by the deleting author or an Admin.

## Project Structure

```
eduplat/
├── app/                    # Next.js app router pages
│   ├── api/               # API routes
│   ├── admin/             # Admin pages
│   ├── instructor/        # Instructor dashboard
│   ├── courses/           # Public course pages
│   ├── learn/             # Student learning interface
│   └── (auth)/            # Authentication pages
├── components/            # Reusable React components
├── lib/                   # Utility functions (auth, db, email)
├── prisma/                # Prisma schema and seed
├── public/                # Static assets
├── scripts/               # Helper scripts
├── types/                 # TypeScript type definitions
└── docs/                  # Documentation
```

## Available Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm run start` – Start production server
- `npm run lint` – Run ESLint
- `npx tsx prisma/seed.ts` – Seed database with development test data

## Deployment

### Deploy to Vercel (Recommended)

1. Push your code to a Git repository (GitHub, GitLab, Bitbucket).
2. Import the project into Vercel.
3. Add environment variables in the Vercel project settings.
4. Deploy.

The `next.config.ts` is already configured for Vercel deployment.

### Environment Variables on Vercel

Ensure all environment variables from `.env` are added to your Vercel project settings.

### Database Considerations

For production, use a dedicated MongoDB Atlas cluster with appropriate security settings (IP whitelisting, database users). Update the `DATABASE_URL` accordingly.

## Troubleshooting

### Authentication Issues

- Ensure `NEXTAUTH_SECRET` is set and matches between environments.
- Verify OAuth credentials are correct and redirect URIs are configured.
- Restart the dev server after changing environment variables.

### Database Connection Errors

- Check that `DATABASE_URL` is correct and the MongoDB cluster is accessible.
- Ensure network access is allowed from your IP (in MongoDB Atlas).
- Run `npx prisma db push` to ensure schema is synchronized.

### File Upload Issues

- Check that the `public/uploads` directory exists and is writable.
- Verify file size limits in `next.config.ts`.

### Windows-Specific Issues

- If `prisma generate` fails with EPERM, close all terminals and delete `node_modules/.prisma/client` manually.
- Use PowerShell or WSL for better compatibility.

## Contributing

1. Fork the repository.
2. Create a feature branch.
3. Commit your changes.
4. Push to the branch.
5. Open a pull request.

## License

This project is licensed under the MIT License.

## Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication by [NextAuth.js](https://next-auth.js.org)
- Database ORM by [Prisma](https://prisma.io)
- Styling with [Tailwind CSS](https://tailwindcss.com)
- Icons from [Lucide React](https://lucide.dev)
- Deployment on [Vercel](https://vercel.com)

## Support

For issues and questions, please open an issue on the GitHub repository.