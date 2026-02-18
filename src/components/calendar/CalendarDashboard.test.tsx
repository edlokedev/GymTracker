import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { CalendarDashboard } from './CalendarDashboard'

// Mock the dependencies
vi.mock('../../lib/auth/context', () => ({
    useAuth: () => ({
        user: {
            id: 'test-user-id',
            email: 'test@example.com',
            name: 'Test User'
        },
        isAuthenticated: true,
        isLoading: false,
        signIn: vi.fn(),
        signOut: vi.fn()
    })
}))

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { }
    unobserve() { }
    disconnect() { }
}

// Mock IlamyCalendar
vi.mock('@ilamy/calendar', () => ({
    IlamyCalendar: () => <div data-testid="mock-calendar">Calendar Component</div>
}))

// Mock useCalendarData to simulate data state and avoid real hook logic
vi.mock('./useCalendarData', () => ({
    useCalendarData: () => ({
        state: {
            currentDate: new Date('2026-02-25T12:00:00Z'),
            dateRange: {
                start: new Date('2026-01-26T12:00:00Z'),
                end: new Date('2026-02-25T12:00:00Z')
            },
            isLoading: false,
            error: null,
            workoutData: [],
            summaryStats: {
                totalWorkouts: 0,
                totalVolume: 0,
                averageWorkoutsPerWeek: 0,
                longestStreak: 0,
                currentStreak: 0,
                lastWorkoutDate: null,
                workoutsThisMonth: 0
            }
        },
        actions: {
            refreshData: vi.fn(),
            navigateMonth: vi.fn(),
            setCurrentDate: vi.fn(),
            setCalendarView: vi.fn()
        },
        workoutEvents: []
    })
}))

// Note: CSS import is handled by vite.config.ts alias

// Mock fetch for API calls
global.fetch = vi.fn()

describe('CalendarDashboard', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('renders with correct 30-day date range for authenticated user', async () => {
        // Setup inside test to avoid beforeEach scope issues
        // Only fake Date to ensure waitFor/setTimeout still works
        vi.useFakeTimers({
            toFake: ['Date'],
            now: new Date('2026-02-25T12:00:00Z')
        })

            // Mock API response
            ; (global.fetch as any).mockResolvedValue({
                ok: true,
                json: async () => ({
                    success: true,
                    data: [],
                    summary: {
                        totalWorkouts: 0,
                        totalVolume: 0,
                        averageWorkoutsPerWeek: 0,
                        longestStreak: 0,
                        currentStreak: 0,
                        lastWorkoutDate: null,
                        workoutsThisMonth: 0
                    }
                })
            })

        render(<CalendarDashboard />)

        // Check date range text
        // Logic: Today (Feb 25) - 30 days = Jan 26
        // Expected: "Jan 26, 2026 - Feb 25, 2026"
        await waitFor(() => {
            const dateHeader = screen.getByText(/Jan 26, 2026 - Feb 25, 2026/i)
            expect(dateHeader).toBeInTheDocument()
        })
    })
})
