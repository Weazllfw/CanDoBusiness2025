import { Spinner } from '../Spinner'
import { cn } from '@/lib/utils'

interface LoadingStateProps {
  className?: string
  message?: string
  size?: 'sm' | 'md' | 'lg'
  fullPage?: boolean
}

export function LoadingState({
  className,
  message = 'Loading...',
  size = 'md',
  fullPage = false
}: LoadingStateProps) {
  const containerClasses = cn(
    'flex flex-col items-center justify-center',
    fullPage ? 'min-h-screen' : 'p-8',
    className
  )

  return (
    <div className={containerClasses}>
      <Spinner size={size} className="text-blue-600" />
      {message && (
        <p className="mt-2 text-sm text-gray-500">{message}</p>
      )}
    </div>
  )
} 