# Quick Start Guide

This guide will help you get started with rebuilding the CanDoBusiness2025 project from scratch.

## Prerequisites

- Node.js 18+
- npm or yarn
- Docker Desktop
- Supabase CLI (`npm install -g supabase`)
- Cursor IDE
- Git

## Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd CanDoBusiness2025
   ```

2. Clean the project (if rebuilding):
   ```bash
   # Backup docs directory first
   cp -r docs/ /tmp/docs-backup
   
   # Remove all directories except docs
   rm -rf cando-frontend/ supabase/ .vscode/ node_modules/
   
   # Restore docs
   cp -r /tmp/docs-backup/* docs/
   ```

3. Follow the Cursor prompts:
   - Open Cursor IDE
   - Navigate to `docs/development/cursor-prompts.md`
   - Follow each section in order
   - Use the prompts with Cursor's AI capabilities

## Development Workflow

1. Start local services:
   ```bash
   # Start Supabase
   cd supabase
   supabase start
   
   # Start Next.js development server
   cd ../cando-frontend
   npm run dev
   ```

2. Access local endpoints:
   - Next.js app: http://localhost:3000
   - Supabase Studio: http://localhost:54323

## Project Structure

```
CanDoBusiness2025/
├── cando-frontend/        # Next.js application
│   ├── app/              # Next.js 13+ app directory
│   ├── src/              # Source code
│   └── public/           # Static files
├── supabase/             # Supabase configuration
│   └── migrations/       # Database migrations
└── docs/                 # Project documentation
```

## Key Features

1. **Authentication**
   - Email/password login
   - Protected routes
   - Session management

2. **Company Management**
   - Create/select companies
   - User-company roles
   - Company context

3. **Dashboard**
   - Company overview
   - User settings
   - Business management

## Development Guidelines

1. **Code Style**
   - Use TypeScript
   - Follow ESLint rules
   - Use Prettier for formatting

2. **Components**
   - Create reusable components
   - Use Tailwind CSS for styling
   - Follow atomic design principles

3. **Testing**
   - Write unit tests
   - Add integration tests
   - Test components in isolation

## Troubleshooting

1. **Database Issues**
   ```bash
   supabase db reset
   supabase start
   ```

2. **Type Generation**
   ```bash
   supabase gen types typescript --local > ../cando-frontend/src/lib/types/database.types.ts
   ```

3. **Next.js Issues**
   ```bash
   # Clear Next.js cache
   cd cando-frontend
   rm -rf .next/
   npm run dev
   ```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)

## Next Steps

1. Follow the Cursor prompts in order
2. Test each feature as you build
3. Update documentation as needed
4. Commit changes frequently
5. Deploy when ready

For detailed setup instructions, refer to `cursor-prompts.md` in this directory. 