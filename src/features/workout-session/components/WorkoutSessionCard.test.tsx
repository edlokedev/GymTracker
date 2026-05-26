import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { WorkoutSession } from '@/lib/types/database'
import { WorkoutSessionCard } from './WorkoutSessionCard'

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    search: _search,
    ...props
  }: {
    children: ReactNode
    to: string
    search?: unknown
    onClick?: MouseEventHandler<HTMLAnchorElement>
    className?: string
    'aria-label'?: string
    title?: string
  }) => (
    <a href={to} {...props}>
      {children}
    </a>
  ),
}))

const session: WorkoutSession = {
  id: 'session-1',
  user_id: 'user-1',
  name: 'Push Day',
  date: '2026-05-26',
  start_time: '2026-05-26T10:00:00.000Z',
  end_time: '2026-05-26T10:45:00.000Z',
  created_at: new Date('2026-05-26T10:00:00.000Z'),
  updated_at: new Date('2026-05-26T10:45:00.000Z'),
}

describe('WorkoutSessionCard', () => {
  afterEach(() => {
    cleanup()
  })

  it('uses icon-only accessible actions without triggering the card click', () => {
    const onClick = vi.fn()
    const onDuplicate = vi.fn()
    const onDelete = vi.fn()

    render(
      <WorkoutSessionCard
        session={session}
        isDuplicating={false}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onClick={onClick}
      />,
    )

    expect(screen.getByLabelText('Edit Push Day')).toBeInTheDocument()
    expect(screen.getByLabelText('Duplicate Push Day')).toBeInTheDocument()
    expect(screen.getByLabelText('Delete Push Day')).toBeInTheDocument()
    expect(screen.queryByText('Duplicate')).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Duplicate Push Day'))

    expect(onDuplicate).toHaveBeenCalledWith('session-1')
    expect(onClick).not.toHaveBeenCalled()
  })
})
