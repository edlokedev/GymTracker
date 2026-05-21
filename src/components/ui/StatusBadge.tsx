interface StatusBadgeProps {
  children: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger' | 'info'
  className?: string
}

const toneClass = {
  neutral:
    'border-gray-200 bg-gray-100 text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300',
  success:
    'border-green-200 bg-green-100 text-green-800 dark:border-green-900 dark:bg-green-950/60 dark:text-green-300',
  warning:
    'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950/60 dark:text-amber-300',
  danger:
    'border-red-200 bg-red-100 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300',
  info: 'border-blue-200 bg-blue-100 text-blue-800 dark:border-blue-900 dark:bg-blue-950/60 dark:text-blue-300',
}

export function StatusBadge({ children, tone = 'neutral', className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass[tone]} ${className}`}
    >
      {children}
    </span>
  )
}
