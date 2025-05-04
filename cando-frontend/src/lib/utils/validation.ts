import { z } from 'zod'
import type { CompanyInsert, CompanyUpdate, CompanyUserInsert, CompanyRole } from '../types/company'
import { COMPANY_ROLES } from '../types/company'

// Company validation schemas
export const companySchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100),
  trading_name: z.string().max(100).nullable().optional(),
  registration_number: z.string().max(50).nullable().optional(),
  tax_number: z.string().max(50).nullable().optional(),
  email: z.string().email().nullable().optional(),
  phone: z.string().max(20).nullable().optional(),
  website: z.string().url().nullable().optional(),
  address: z.record(z.unknown()).nullable().optional()
})

export const companyUpdateSchema = companySchema.partial()

// Company user validation schemas
export const companyUserSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member', 'viewer'] as const),
  is_primary: z.boolean().optional()
})

// Validation functions
export function validateCompanyData(data: CompanyInsert) {
  return companySchema.parse(data)
}

export function validateCompanyUpdate(data: CompanyUpdate) {
  return companyUpdateSchema.parse(data)
}

export function validateCompanyUser(data: CompanyUserInsert) {
  return companyUserSchema.parse(data)
}

// Error handling utilities
export class ValidationError extends Error {
  constructor(message: string, public errors?: z.ZodError) {
    super(message)
    this.name = 'ValidationError'
  }
}

export function formatValidationError(error: z.ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ')
}

// Security utilities
export function sanitizeInput(input: string): string {
  return input.replace(/[<>]/g, '')
}

export function isValidUUID(uuid: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
} 