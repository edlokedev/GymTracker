import type { HTMLAttributes } from 'react'

export function ScrollArea({ className = '', children, ...props }: HTMLAttributes<HTMLDivElement>) {
  const classes = ['app-scrollbar', className].filter(Boolean).join(' ')

  return (
    <div {...props} className={classes}>
      {children}
    </div>
  )
}
