# CanDo Business Network - Frontend

A modern Canadian B2B networking and supply chain matchmaking platform built with Next.js and Supabase.

## Features

- Social Feed for business updates and RFQs
- Direct messaging between businesses
- Company profiles and management
- Multi-tenant support for managing multiple companies
- Modern and intuitive interface

## Tech Stack

- Next.js 14 with App Router
- TypeScript
- Tailwind CSS
- Supabase for backend and authentication
- React Hook Form for form management
- Zod for validation

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file with the following variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

```
src/
  ├── app/                # Next.js App Router pages
  │   ├── auth/          # Authentication pages
  │   ├── company/       # Company management
  │   ├── feed/          # Social feed and RFQs
  │   └── messages/      # Messaging system
  ├── components/        # Reusable React components
  ├── lib/              # Utility functions and configurations
  ├── types/            # TypeScript type definitions
  └── utils/            # Helper functions
```

## Development Guidelines

- Use TypeScript for all new files
- Follow the existing component structure
- Use Tailwind CSS for styling
- Implement proper error handling
- Write meaningful commit messages

## Environment Setup

The application requires a Supabase project with the following tables:
- companies
- posts
- messages

Refer to the database schema in `src/types/supabase.ts` for the complete structure. 