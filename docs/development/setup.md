# Development Setup Guide

## Prerequisites

- Node.js (v20.17.0 or higher)
- npm (v11.0.0 or higher)
- Git

## Getting Started

1. Clone the repository:
```bash
git clone https://github.com/yourusername/CanDoBusiness2025.git
cd CanDoBusiness2025
```

2. Install frontend dependencies:
```bash
cd cando-frontend
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:
```env
NEXT_PUBLIC_API_URL=http://localhost:3000
# Add other environment variables as needed
```

## Development Server

1. Start the frontend development server:
```bash
npm run dev
```

The application will be available at:
- Local: http://localhost:3000
- Network: http://[your-ip]:3000

## Project Structure

```
CanDoBusiness2025/
├── cando-frontend/        # Next.js frontend application
├── docs/                  # Project documentation
│   ├── architecture/     # Architecture documentation
│   ├── database/        # Database schemas and migrations
│   ├── development/     # Development guides
│   ├── features/        # Feature specifications
│   └── overview/        # Project overview
├── scripts/              # Development and deployment scripts
└── supabase/             # Supabase configuration and migrations
```

## Code Organization

### Frontend (`cando-frontend/`)

- `app/` - Next.js App Router pages and layouts
- `src/components/` - Reusable React components
- `src/lib/` - Utility functions and hooks
- `public/` - Static assets

### Documentation (`docs/`)

- `architecture/` - System architecture and design decisions
- `database/` - Database schema and migration guides
- `development/` - Development setup and guidelines
- `features/` - Feature specifications and requirements
- `overview/` - Project overview and goals

## Development Workflow

1. Create a new branch for your feature/fix:
```bash
git checkout -b feature/your-feature-name
```

2. Make your changes and commit them:
```bash
git add .
git commit -m "Description of your changes"
```

3. Push your changes and create a pull request:
```bash
git push origin feature/your-feature-name
```

## Code Style

- Use TypeScript for all new code
- Follow the existing project structure
- Use Prettier for code formatting
- Follow ESLint rules
- Write meaningful commit messages

## Testing

1. Run unit tests:
```bash
npm run test
```

2. Run end-to-end tests:
```bash
npm run test:e2e
```

## Building for Production

1. Build the frontend:
```bash
cd cando-frontend
npm run build
```

2. Test the production build locally:
```bash
npm run start
```

## Troubleshooting

### Common Issues

1. Node.js version mismatch:
```bash
nvm use 20
```

2. Port already in use:
```bash
# Find and kill the process using port 3000
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

3. Module not found errors:
```bash
# Clear npm cache and reinstall dependencies
npm cache clean --force
rm -rf node_modules
npm install
```

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs)
- [Supabase Documentation](https://supabase.io/docs) 