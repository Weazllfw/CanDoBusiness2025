import { cn } from '@/lib/utils'

export interface SectionProps {
  children: React.ReactNode
  className?: string
  spacing?: 'none' | 'sm' | 'md' | 'lg'
  background?: 'white' | 'gray' | 'transparent'
}

export function Section({
  children,
  className,
  spacing = 'md',
  background = 'transparent'
}: SectionProps) {
  const spacings = {
    none: '',
    sm: 'py-4',
    md: 'py-8',
    lg: 'py-12'
  }

  const backgrounds = {
    white: 'bg-white',
    gray: 'bg-gray-50',
    transparent: ''
  }

  return (
    <section
      className={cn(
        spacings[spacing],
        backgrounds[background],
        className
      )}
    >
      {children}
    </section>
  )
} 