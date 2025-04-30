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

3. TopNavBar (`src/components/layout/TopNavBar.tsx`):
   - Client-side component with responsive navigation
   - Features:
     - Brand logo and name
     - Main navigation links (Home, RFQs)
     - Notification center with counter
     - User profile dropdown menu
   
   Navigation Structure:
   - Main Navigation:
     - Home: Dashboard overview
     - RFQs: Request for Quotations section
   - User Navigation:
     - Profile settings
     - Account settings
     - Sign out option
   
   Components Used:
   - Headless UI Menu for dropdown
   - Heroicons for icons
   - Next.js Link for navigation
   
   Responsive Design:
   - Desktop: Full navigation with all items visible
   - Mobile: Condensed navigation with essential items
   
   Implementation Notes:
   - Uses Headless UI for accessible dropdowns
   - Implements smooth transitions for menus
   - Maintains consistent height (16 units)
   - Integrates with DashboardLayout for full-page structure

## Components

### Layout Components

1. DashboardLayout (`src/components/layout/DashboardLayout.tsx`):
   - Client-side component (marked with 'use client' directive)
   - Provides a responsive dashboard shell with:
     - Full-height layout with flex structure
     - Fixed-width sidebar (64 units wide)
     - Collapsible mobile navigation
     - Smooth transition animations
   
   Features:
   - Responsive Design:
     - Desktop: Static sidebar with full content width
     - Mobile: Collapsible sidebar with overlay
   - Interactive Elements:
     - Toggle buttons for mobile menu
     - Overlay backdrop for mobile view
     - Smooth transitions for sidebar
   
   Props:
   ```typescript
   interface DashboardLayoutProps {
     children: ReactNode;  // Main content to render
   }
   ```

   State Management:
   - Uses `useState` for sidebar visibility
   - `sidebarOpen` controls mobile menu state
   
   CSS Classes:
   - Uses Tailwind for responsive styling
   - Key breakpoints:
     - `lg:` for desktop layouts
     - Default mobile-first approach
   
   Usage Example:
   ```typescript
   import { DashboardLayout } from '@/components/layout/DashboardLayout';
   
   export default function DashboardPage() {
     return (
       <DashboardLayout>
         <div>Dashboard Content</div>
       </DashboardLayout>
     );
   }
   ```

   Implementation Notes:
   - Must be wrapped in a client component due to React hooks usage
   - Uses HeroIcons for menu icons
   - Implements z-index layering for proper overlay behavior
   - Maintains consistent header height (16 units)

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

## Navigation System

The application implements a modern, responsive navigation system inspired by professional social networking platforms. The navigation is split into three main components:

1. Top Navigation Bar (Primary)
2. Sidebar Navigation (Secondary)
3. Mobile Navigation

### Top Navigation Bar

The TopNavBar (`src/components/layout/TopNavBar.tsx`) serves as the primary navigation component:

```typescript
const navigation = [
  { name: 'Home', href: '/dashboard', icon: HomeIcon },
  { name: 'RFQs', href: '/dashboard/rfq', icon: DocumentTextIcon },
];

const userNavigation = [
  { name: 'Your Profile', href: '/dashboard/profile' },
  { name: 'Settings', href: '/dashboard/settings' },
  { name: 'Sign out', href: '/auth/logout' },
];
```

Features:
- Brand Identity:
  - Logo placement
  - Company name with emphasis on "CanDo" and subtle "Business" suffix
- Main Navigation:
  - Icon + Text links for primary sections
  - Responsive hiding on mobile devices
- User Controls:
  - Notification center with counter
  - Profile dropdown with user-specific actions
  - Accessible menu system using Headless UI

Styling:
- Consistent height (64px/4rem)
- Subtle shadow and border for depth
- High contrast for accessibility
- Focus states for keyboard navigation

### Sidebar Navigation

The sidebar (`DashboardLayout.tsx`) provides secondary navigation:

- Desktop:
  - Persistent 256px wide sidebar
  - Static positioning
  - Full-height layout
- Mobile:
  - Collapsible drawer with overlay
  - Floating action button for access
  - Smooth slide transitions

### Mobile Considerations

The navigation system is built with a mobile-first approach:

1. Top Bar Adaptations:
   - Condensed layout on small screens
   - Hidden secondary navigation items
   - Touch-friendly tap targets (min 44px)

2. Sidebar Adaptations:
   - Transforms to slide-out drawer
   - Backdrop overlay for focus
   - Bottom-right FAB for easy access

3. Interaction Patterns:
   - Swipe gestures (planned)
   - Touch-friendly menus
   - Clear visual feedback

### Future Extensions

The navigation system is designed for extensibility:

1. Additional Features:
   - Search functionality in top bar
   - Quick action menu
   - Context-aware navigation
   - Breadcrumb integration

2. Notification System:
   - Real-time updates
   - Category-based filtering
   - Interactive notifications
   - Read/unread status

3. User Profile Enhancements:
   - User avatar integration
   - Status indicators
   - Quick settings access
   - Multiple account support

4. Customization Options:
   - Theme switching
   - Layout preferences
   - Navigation item ordering
   - Sidebar width control

### Best Practices

When extending the navigation system:

1. Component Organization:
   - Keep navigation-related components in `src/components/layout`
   - Maintain separation between layout and feature components
   - Use composition for complex navigation items

2. State Management:
   - Use React context for shared navigation state
   - Implement proper loading states
   - Handle authentication status

3. Accessibility:
   - Maintain ARIA landmarks
   - Ensure keyboard navigation
   - Provide skip links
   - Test with screen readers

4. Performance:
   - Lazy load secondary navigation items
   - Optimize icon imports
   - Minimize layout shifts
   - Cache navigation data

### Integration Guidelines

When adding new navigation items:

1. Top Bar:
   ```typescript
   // Add to navigation array in TopNavBar.tsx
   const navigation = [
     // Existing items...
     { 
       name: 'New Feature',
       href: '/dashboard/new-feature',
       icon: FeatureIcon,
     },
   ];
   ```

2. User Menu:
   ```typescript
   // Add to userNavigation array
   const userNavigation = [
     // Existing items...
     {
       name: 'New Option',
       href: '/dashboard/new-option',
     },
   ];
   ```

3. Mobile Considerations:
   - Ensure new items adapt to mobile layout
   - Test touch interactions
   - Verify overlay behavior 