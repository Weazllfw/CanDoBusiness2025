# Top Bar Navigation System

## 1. Overview

The top bar navigation system provides the main navigation interface for the application. It consists of a header with various interactive components and a responsive layout system that adapts to different screen sizes.

## 2. Components

### 2.1. Header (`Header.tsx`)
*   **Location:** `src/components/layout/Header.tsx`
*   **Purpose:** Main navigation container
*   **Features:**
    *   Responsive design
    *   User authentication state
    *   Navigation links
    *   Interactive components
*   **Props:**
    ```typescript
    interface HeaderProps {
      user?: User;
      onSignOut?: () => void;
    }
    ```

### 2.2. Main Navigation (`MainNav.tsx`)
*   **Location:** `src/components/layout/MainNav.tsx`
*   **Purpose:** Primary navigation links
*   **Features:**
    *   Dynamic route highlighting
    *   Permission-based visibility
    *   Responsive dropdown
    *   Icon integration
*   **Navigation Items:**
    ```typescript
    interface NavItem {
      label: string;
      href: string;
      icon?: IconComponent;
      requiresAuth?: boolean;
      children?: NavItem[];
    }
    ```

### 2.3. Notification Bell (`NotificationBell.tsx`)
*   **Location:** `src/components/layout/NotificationBell.tsx`
*   **Purpose:** Notification indicator and dropdown
*   **Features:**
    *   Unread count badge
    *   Real-time updates
    *   Notification preview
    *   Mark as read functionality

### 2.4. Layout Wrapper (`LayoutWrapper.tsx`)
*   **Location:** `src/components/layout/LayoutWrapper.tsx`
*   **Purpose:** Page layout container
*   **Features:**
    *   Consistent spacing
    *   Responsive padding
    *   Content width control
    *   Layout structure

### 2.5. Sidebar (`Sidebar.tsx`)
*   **Location:** `src/components/layout/Sidebar.tsx`
*   **Purpose:** Secondary navigation
*   **Features:**
    *   Context-specific links
    *   Collapsible sections
    *   Mobile responsiveness
    *   Dynamic content

## 3. Navigation Structure

### 3.1. Main Routes
*   Home (`/`)
*   Feed (`/feed`)
*   Companies (`/companies`)
*   RFQs (`/rfqs`)
*   Messages (`/messages`)
*   Profile (`/profile`)
*   Admin (`/admin`) - Conditional

### 3.2. Secondary Routes
*   Company Management (`/company/*`)
*   Settings (`/settings/*`)
*   Notifications (`/notifications`)
*   Help & Support (`/help`)

## 4. Interactive Features

### 4.1. User Menu
*   Profile link
*   Company selector
*   Settings access
*   Sign out option

### 4.2. Notifications
*   Real-time updates
*   Unread indicators
*   Quick actions
*   Notification center link

### 4.3. Search
*   Global search
*   Quick results
*   Advanced filters
*   Recent searches

## 5. Responsive Design

### 5.1. Desktop Layout
*   Full navigation bar
*   Expanded menu items
*   Hover states
*   Multi-level dropdowns

### 5.2. Mobile Layout
*   Hamburger menu
*   Collapsible navigation
*   Touch-friendly targets
*   Simplified dropdowns

## 6. State Management

### 6.1. Authentication State
*   User session handling
*   Protected routes
*   Role-based access
*   Login/logout flow

### 6.2. Navigation State
*   Active route tracking
*   Breadcrumb generation
*   History management
*   Deep linking

## 7. Performance

### 7.1. Optimization
*   Code splitting
*   Lazy loading
*   Route prefetching
*   Component memoization

### 7.2. Caching
*   Route caching
*   Navigation data
*   User preferences
*   Search history

## 8. Accessibility

### 8.1. Standards
*   ARIA labels
*   Keyboard navigation
*   Focus management
*   Screen reader support

### 8.2. User Experience
*   Clear visual hierarchy
*   Consistent behavior
*   Error handling
*   Loading states

## 9. Security

### 9.1. Route Protection
*   Authentication checks
*   Role verification
*   Permission validation
*   Secure redirects

### 9.2. Data Safety
*   XSS prevention
*   CSRF protection
*   Input validation
*   Secure storage

## 10. Future Enhancements

*   Custom navigation themes
*   Enhanced search integration
*   Personalized shortcuts
*   Activity history
*   Navigation analytics
*   Mobile app integration 