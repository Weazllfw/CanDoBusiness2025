# Cursor Prompts for Project Setup

This document contains a series of prompts to use with Cursor to rebuild the CanDoBusiness2025 project from scratch. Follow these prompts in order.

## 1. Project Initialization

### 1.1 Next.js Project Setup
```prompt
Create a new Next.js 13+ project with TypeScript and Tailwind CSS. Set up the following structure:
- Project name: cando-frontend
- Use src directory
- Include ESLint
- Create the following directory structure:
  - src/
    - components/
      - common/
      - layout/
      - ui/
    - lib/
      - contexts/
      - db/
      - hooks/
      - types/
  - app/
    - auth/
      - login/
      - signup/
    - dashboard/
      - account/
      - business/
    - (root)/
      - layout.tsx
      - page.tsx

Initialize git and add appropriate .gitignore
```

### 1.2 Supabase Setup
```prompt
Set up Supabase local development:
1. Create supabase/ directory
2. Initialize Supabase project
3. Create initial migration file with the following schema:
   - users table (managed by auth)
   - companies table
   - user_company_roles table
4. Add appropriate environment variables
5. Generate TypeScript types
```

## 2. Authentication Implementation

### 2.1 Supabase Auth Setup
```prompt
Implement Supabase authentication:
1. Create auth helper functions in src/lib/auth.ts
2. Set up login page with email/password
3. Set up signup page
4. Add authentication middleware
5. Create protected route wrapper
6. Implement sign out functionality
7. Add loading and error states
```

### 2.2 Auth Components
```prompt
Create authentication components:
1. LoginForm component with:
   - Email/password fields
   - Remember me checkbox
   - Forgot password link
   - Submit button with loading state
2. SignupForm component
3. AuthLayout component
4. Add proper form validation
5. Add error handling
6. Style with Tailwind CSS
```

## 3. Company Management

### 3.1 Company Context
```prompt
Create CompanyContext with the following features:
1. Company type definitions
2. Context provider with:
   - Current company state
   - Company list state
   - Loading states
   - Error handling
3. Company selection logic
4. Company creation function
5. Company refresh function
6. Proper TypeScript types
7. Integration with Supabase
```

### 3.2 Company Selector Component
```prompt
Create CompanySelector component:
1. Dropdown UI using Headless UI
2. Company list display
3. Current company indicator
4. Create new company option
5. Loading states
6. Error handling
7. Proper styling with Tailwind
8. Accessibility features
```

## 4. Dashboard Implementation

### 4.1 Dashboard Layout
```prompt
Create dashboard layout with:
1. Top navigation bar with:
   - Company selector
   - User menu
   - Navigation items
2. Sidebar with:
   - Main navigation
   - Secondary navigation
3. Main content area
4. Responsive design
5. Proper styling
```

### 4.2 Dashboard Pages
```prompt
Implement dashboard pages:
1. Main dashboard with:
   - Company overview
   - Key metrics
   - Recent activity
2. Account settings
3. Business settings
4. Company management
```

## 5. Database Operations

### 5.1 Database Helpers
```prompt
Create database helper functions:
1. Company operations:
   - Create company
   - Update company
   - Delete company
   - List companies
2. User role operations:
   - Add user to company
   - Remove user from company
   - Update user role
3. Error handling
4. TypeScript types
```

### 5.2 Database Migrations
```prompt
Create Supabase migrations for:
1. Base schema
2. Indexes
3. RLS policies
4. Helper functions
5. Triggers
```

## 6. UI Components

### 6.1 Common Components
```prompt
Create reusable UI components:
1. Button component with variants
2. Input component with validation
3. Card component
4. Modal component
5. Alert component
6. Loading spinner
7. Error boundary
8. Form components
```

### 6.2 Layout Components
```prompt
Create layout components:
1. Page container
2. Section container
3. Grid layouts
4. Flex containers
5. Responsive containers
```

## 7. Testing Setup

### 7.1 Test Configuration
```prompt
Set up testing environment:
1. Configure Jest
2. Add React Testing Library
3. Create test utilities
4. Set up test database
5. Add CI configuration
```

### 7.2 Test Implementation
```prompt
Create tests for:
1. Authentication flow
2. Company management
3. Database operations
4. UI components
5. Integration tests
```

## 8. Documentation

### 8.1 Technical Documentation
```prompt
Create technical documentation:
1. API documentation
2. Component documentation
3. Database schema
4. Authentication flow
5. Development setup guide
```

### 8.2 User Documentation
```prompt
Create user documentation:
1. User guide
2. Feature documentation
3. FAQ
4. Troubleshooting guide
```

## Usage Instructions

1. Start with Project Initialization prompts
2. Follow each section in order
3. Test after completing each major section
4. Update documentation as you progress
5. Commit code after each significant change

## Notes

- Each prompt assumes you're using Cursor with its AI capabilities
- Adjust prompts based on specific requirements or changes
- Test thoroughly after each major implementation
- Keep documentation updated as you progress
- Follow TypeScript best practices throughout
- Maintain consistent styling with Tailwind CSS
- Ensure proper error handling at each step 