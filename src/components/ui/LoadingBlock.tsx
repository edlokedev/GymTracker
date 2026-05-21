interface LoadingBlockProps {
  label?: string
  className?: string
}

export function LoadingBlock({ label = 'Loading...', className = '' }: LoadingBlockProps) {
  return (
    <div
      className={`flex items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white/70 p-6 text-sm font-medium text-gray-600 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-300 ${className}`}
      role="status"
      aria-live="polite"
    >
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
      <span>{label}</span>
    </div>
  )
}
