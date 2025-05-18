# Company Onboarding Process

## 1. Overview

The company onboarding process guides users through creating and setting up their company profile on the platform. It includes company information collection, verification steps, and initial setup of company features.

## 2. Components

### 2.1. Company Form (`CompanyForm.tsx`)
*   **Location:** `src/components/company/CompanyForm.tsx`
*   **Purpose:** Main form for company creation and editing
*   **Features:**
    *   Multi-step form process
    *   Form validation
    *   File upload handling
    *   Progress tracking
*   **Key Sections:**
    ```typescript
    interface CompanyFormSections {
      basicInfo: boolean;
      contactDetails: boolean;
      businessDetails: boolean;
      verification: boolean;
      documents: boolean;
      review: boolean;
    }
    ```

### 2.2. Company Selector (`CompanySelector.tsx`)
*   **Location:** `src/components/company/CompanySelector.tsx`
*   **Purpose:** Component for selecting/switching between companies
*   **Features:**
    *   Company list display
    *   Quick company switching
    *   Company creation trigger
    *   Permission checks

## 3. Onboarding Flow

### 3.1. Basic Information
*   Company name
*   Business description
*   Industry selection
*   Website URL
*   Company size
*   Year founded

### 3.2. Contact Details
*   Primary contact information
*   Business address
*   Phone numbers
*   Email addresses
*   Social media links

### 3.3. Business Details
*   Business registration number
*   Tax identification
*   Operating locations
*   Business hours
*   Service areas

### 3.4. Verification Process
*   Document upload interface
*   Verification tier selection
*   Status tracking
*   Compliance checks

### 3.5. Document Management
*   Business registration
*   Tax documents
*   Licenses/permits
*   Insurance certificates
*   Additional documentation

### 3.6. Review & Submit
*   Information review
*   Terms acceptance
*   Submission confirmation
*   Next steps guidance

## 4. Database Integration

### 4.1. Core Tables

#### 4.1.1. `companies` Table
*   **Core Fields:**
    *   `id` UUID (PK)
    *   `owner_id` UUID (FK to `public.profiles`)
    *   `name` TEXT
    *   `description` TEXT
    *   `website` TEXT
    *   `industry` TEXT
    *   `location` TEXT
    *   `created_at` TIMESTAMPTZ
    *   `updated_at` TIMESTAMPTZ

#### 4.1.2. `company_verification` Table
*   **Core Fields:**
    *   `company_id` UUID (PK, FK to `companies`)
    *   `verification_tier` verification_tier_enum
    *   `status` verification_status_enum
    *   `submitted_at` TIMESTAMPTZ
    *   `verified_at` TIMESTAMPTZ
    *   `verified_by` UUID

## 5. Storage Integration

### 5.1. Document Storage
*   **Bucket:** 'company-documents'
*   **Structure:**
    ```
    company-documents/
    ├── {company_id}/
    │   ├── verification/
    │   │   ├── business_registration.pdf
    │   │   ├── tax_documents.pdf
    │   │   └── ...
    │   ├── logo/
    │   │   └── company_logo.png
    │   └── additional/
    │       └── ...
    ```

### 5.2. Access Control
*   RLS policies for document access
*   Owner-only write permissions
*   Admin review capabilities
*   Temporary URL generation

## 6. Validation & Security

### 6.1. Form Validation
*   Required field checks
*   Format validation
*   Duplicate detection
*   File type verification
*   Size limit enforcement

### 6.2. Security Measures
*   Data sanitization
*   CSRF protection
*   Rate limiting
*   Permission checks
*   Audit logging

## 7. Error Handling

### 7.1. User Feedback
*   Validation errors
*   Submission failures
*   Progress saving
*   Recovery options

### 7.2. System Errors
*   Database errors
*   Storage failures
*   Network issues
*   Timeout handling

## 8. Performance

### 8.1. Form Performance
*   Progressive loading
*   Debounced validation
*   Optimistic updates
*   State management

### 8.2. File Handling
*   Chunked uploads
*   Compression
*   Format conversion
*   Progress tracking

## 9. Notifications

### 9.1. User Notifications
*   Submission confirmation
*   Verification updates
*   Document requests
*   Approval notices

### 9.2. Admin Notifications
*   New company alerts
*   Verification requests
*   Document updates
*   Action items

## 10. Future Enhancements

*   Enhanced document verification
*   AI-powered validation
*   Integration with external verification services
*   Bulk company import
*   Advanced company settings
*   Custom field support 