# Frontend Development Guide

## Project Structure

The frontend is built using Next.js 15.3.1 with the App Router. Here's the key directory structure:

```
cando-frontend/
├── app/                      # Next.js App Router directory
│   ├── auth/                # Authentication-related pages
│   │   └── login/          # Login page
│   ├── dashboard/          # Dashboard pages and layout
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Root page (redirects to login/dashboard)
│   └── globals.css         # Global styles
├── src/
│   ├── components/         # Reusable components
│   │   ├── common/        # Common UI components
│   │   ├── layout/        # Layout components
│   │   └── ui/            # UI-specific components
│   ├── lib/               # Utility functions and hooks
│   │   ├── hooks/        # Custom React hooks
│   │   └── types/        # TypeScript type definitions
├── public/                 # Static assets
└── package.json           # Project dependencies
```

## Routing Structure

The application uses Next.js App Router with the following route structure:

- `/` - Root route (redirects to `/dashboard` or `/auth/login`)
- `/auth/login` - Login page
- `/dashboard` - Main dashboard page

### Page Components

1. Root Page (`app/page.tsx`):
   - Handles authentication check and redirects
   - Redirects to dashboard if authenticated, login if not

2. Login Page (`app/auth/login/page.tsx`):
   - Provides user authentication form
   - Links to signup page
   - Uses common Button and Input components

3. Dashboard Page (`app/dashboard/page.tsx`):
   - Client-side rendered (`'use client'`)
   - Displays business metrics and activity
   - Uses Card components for consistent UI

### Layouts

1. Root Layout (`app/layout.tsx`):
   - Sets up Geist font
   - Provides base HTML structure
   - Applies global styles

2. Dashboard Layout (`app/dashboard/layout.tsx`):
   - Wraps dashboard pages with DashboardLayout component
   - Provides navigation and header structure

## Components

### Layout Components

1. DashboardLayout (`src/components/layout/DashboardLayout.tsx`):
   - Responsive sidebar navigation
   - Mobile-friendly with collapsible menu
   - Header with navigation controls
   - Main content area with proper spacing

### Common Components

Located in `src/components/common/`:
- Button - Reusable button component
- Card - Card container with header and content sections
- Input - Form input fields
- Tabs - Navigation tabs component

## Styling

The project uses:
- Tailwind CSS for styling
- Geist font for typography
- Custom CSS in globals.css for base styles

## Development

To run the development server:

```bash
npm run dev
```

The application will be available at:
- Local: http://localhost:3000
- Network: http://[your-ip]:3000

## Best Practices

1. Page Organization:
   - Keep pages in the `app` directory
   - Use appropriate route groups for organization
   - Implement proper layouts for consistent UI

2. Component Structure:
   - Common components in `src/components/common`
   - Layout components in `src/components/layout`
   - Page-specific components alongside their pages

3. TypeScript:
   - Use TypeScript for all components
   - Define interfaces for component props
   - Maintain type definitions in `src/lib/types`

4. Styling:
   - Use Tailwind CSS utility classes
   - Follow mobile-first responsive design
   - Maintain consistent spacing and colors 