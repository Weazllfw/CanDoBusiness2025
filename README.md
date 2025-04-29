# CanDo Business Platform

A modern business platform built with Next.js 15.3.1, TypeScript, and Tailwind CSS, designed to connect and empower businesses.

## Project Overview

The CanDo Business Platform is a modern solution that helps businesses:
- Connect with potential partners and customers
- Track business metrics and activities
- Manage user interactions and engagement
- Provide secure authentication
- Monitor performance analytics

## Tech Stack

- **Frontend**: Next.js 15.3.1, TypeScript, Tailwind CSS
- **UI Components**: Custom components with Tailwind
- **Development**: Node.js (v20.17.0+), npm (v11.0.0+)
- **Deployment**: Vercel

## Project Structure

```
CanDoBusiness2025/
├── cando-frontend/        # Next.js frontend application
│   ├── app/             # Next.js App Router pages
│   ├── src/            # Source code
│   │   ├── components/ # React components
│   │   └── lib/       # Utilities and hooks
│   └── public/        # Static assets
├── docs/                 # Project documentation
│   ├── architecture/    # System architecture
│   ├── database/       # Database schema
│   ├── development/    # Development guides
│   ├── features/       # Feature documentation
│   └── overview/       # Project overview
└── scripts/             # Development and utility scripts
```

## Getting Started

1. **Prerequisites**
   - Node.js v20.17.0 or higher
   - npm v11.0.0 or higher

2. **Installation**
   ```bash
   # Clone the repository
   git clone https://github.com/yourusername/CanDoBusiness2025.git
   cd CanDoBusiness2025

   # Install frontend dependencies
   cd cando-frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Copy environment template
   cp .env.example .env.local
   ```

4. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Local: http://localhost:3000
   - Network: http://[your-ip]:3000

For detailed setup instructions, see:
- [Development Setup Guide](docs/development/setup.md)
- [Frontend Documentation](docs/development/frontend.md)

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm test` - Run tests

## Documentation

- [Project Overview](docs/overview/README.md)
- [Architecture](docs/architecture/README.md)
- [Development Guides](docs/development/README.md)
- [Feature Documentation](docs/features/README.md)

## Development Guidelines

1. **Code Organization**
   - Keep pages in the `app` directory
   - Reusable components in `src/components`
   - Utilities and hooks in `src/lib`

2. **Best Practices**
   - Use TypeScript for all new code
   - Follow the existing project structure
   - Write meaningful commit messages
   - Update documentation as needed

3. **Styling**
   - Use Tailwind CSS for styling
   - Follow mobile-first responsive design
   - Maintain consistent spacing and colors

## Contributing

1. Create a new branch for your feature/fix
2. Follow the development guidelines
3. Test your changes thoroughly
4. Update relevant documentation
5. Submit a pull request

## Support

For issues and questions:
1. Check the [documentation](docs/)
2. Use the issue tracker
3. Contact the development team

## License

This project is proprietary and confidential. All rights reserved. 