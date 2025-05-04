import { cn } from '@/lib/utils'

export interface FlexProps {
  children: React.ReactNode
  className?: string
  direction?: 'row' | 'col'
  align?: 'start' | 'center' | 'end' | 'stretch'
  justify?: 'start' | 'center' | 'end' | 'between' | 'around'
  gap?: 'none' | 'sm' | 'md' | 'lg'
  wrap?: boolean
}

export function Flex({
  children,
  className,
  direction = 'row',
  align = 'start',
  justify = 'start',
  gap = 'none',
  wrap = false
}: FlexProps) {
  const directions = {
    row: 'flex-row',
    col: 'flex-col'
  }

  const alignments = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  }

  const justifications = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around'
  }

  const gaps = {
    none: 'gap-0',
    sm: 'gap-4',
    md: 'gap-6',
    lg: 'gap-8'
  }

  return (
    <div
      className={cn(
        'flex',
        directions[direction],
        alignments[align],
        justifications[justify],
        gaps[gap],
        wrap && 'flex-wrap',
        className
      )}
    >
      {children}
    </div>
  )
} 