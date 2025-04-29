# CanDo Business Frontend

This is the frontend application for the CanDo Business platform, built with Next.js 14, TypeScript, and Tailwind CSS.

## Getting Started

### Prerequisites

- Node.js 18.x or later
- npm 9.x or later
- Supabase project (for authentication)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
# Copy the example env file
cp .env.local.example .env.local

# Edit .env.local with your Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

3. Run the development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure

See [Frontend Architecture](../docs/development/frontend.md) for detailed documentation about:
- Directory organization
- Component library
- Authentication flow
- Development guidelines

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Contributing

1. Follow the TypeScript and ESLint configurations
2. Use the provided UI components from `src/components/ui`
3. Follow the component guidelines in the documentation
4. Add proper types for all new code
5. Test your changes before submitting

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
