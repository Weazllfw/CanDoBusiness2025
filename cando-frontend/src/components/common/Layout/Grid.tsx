import { cn } from '@/lib/utils'

export interface GridProps {
  children: React.ReactNode
  className?: string
  cols?: 1 | 2 | 3 | 4 | 6 | 12
  gap?: 'none' | 'sm' | 'md' | 'lg'
  colsSmall?: 1 | 2 | 3 | 4
  colsMedium?: 1 | 2 | 3 | 4 | 6
}

export function Grid({
  children,
  className,
  cols = 1,
  gap = 'md',
  colsSmall,
  colsMedium
}: GridProps) {
  const columns = {
    1: 'grid-cols-1',
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    6: 'grid-cols-6',
    12: 'grid-cols-12'
  }

  const smallColumns = {
    1: 'sm:grid-cols-1',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4'
  }

  const mediumColumns = {
    1: 'md:grid-cols-1',
    2: 'md:grid-cols-2',
    3: 'md:grid-cols-3',
    4: 'md:grid-cols-4',
    6: 'md:grid-cols-6'
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
        'grid',
        columns[cols],
        colsSmall && smallColumns[colsSmall],
        colsMedium && mediumColumns[colsMedium],
        gaps[gap],
        className
      )}
    >
      {children}
    </div>
  )
} 