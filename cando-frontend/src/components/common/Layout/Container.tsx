import { cn } from '@/lib/utils'

export interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Container({ 
  children, 
  className,
  size = 'lg',
  padding = 'md'
}: ContainerProps) {
  const sizes = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-7xl',
    xl: 'max-w-[96rem]',
    full: 'max-w-full'
  }

  const paddings = {
    none: 'px-0',
    sm: 'px-4 sm:px-6',
    md: 'px-4 sm:px-6 lg:px-8',
    lg: 'px-4 sm:px-6 lg:px-12'
  }

  return (
    <div
      className={cn(
        'mx-auto w-full',
        sizes[size],
        paddings[padding],
        className
      )}
    >
      {children}
    </div>
  )
} 