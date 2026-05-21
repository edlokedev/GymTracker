interface InlineErrorProps {
  message?: string | null
  className?: string
}

export function InlineError({ message, className = '' }: InlineErrorProps) {
  if (!message) return null

  return (
    <p
      className={`rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 dark:border-red-900/70 dark:bg-red-950/50 dark:text-red-300 ${className}`}
      role="alert"
    >
      {message}
    </p>
  )
}
