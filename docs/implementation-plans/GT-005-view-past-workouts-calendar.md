# GT-005 View Past Workouts and Last Workout Date - Implementation Planning

## User Story

As a gym user, I want to view my past workouts in a calendar format and see when I last worked out, so that I can review my workout history and maintain consistency in my training schedule.

## Pre-conditions

- User must be authenticated and logged in
- Dashboard route (`/`) must be accessible for authenticated users
- Database schema must support WorkoutSession and WorkoutSet tables (even if empty)
- Calendar should gracefully handle empty states for new users with no workout history

## Design

### Visual Layout

The calendar dashboard feature will consist of:
- **Calendar Grid**: Rolling 30-day calendar view with workout indicators
- **Summary Stats Panel**: Quick stats like workout count, last workout date, streaks
- **Date Navigation**: Previous/next month navigation controls
- **Workout Detail Modal**: Expandable workout details when clicking calendar days
- **Mobile-Responsive Layout**: Adaptive calendar that works on all screen sizes

### Color and Typography

- **Background Colors**: 
  - Primary: bg-white dark:bg-gray-900
  - Calendar background: bg-gray-50 dark:bg-gray-800
  - Workout day: bg-blue-100 dark:bg-blue-900/30
  - Rest day: bg-gray-100 dark:bg-gray-700
  - Today highlight: bg-blue-500 dark:bg-blue-600

- **Typography**:
  - Calendar header: font-inter text-xl font-semibold text-gray-900 dark:text-white
  - Date numbers: font-inter text-sm font-medium text-gray-700 dark:text-gray-300
  - Workout indicators: text-xs font-medium text-blue-700 dark:text-blue-300
  - Stats: font-inter text-lg font-bold text-gray-900 dark:text-white

- **Component-Specific**:
  - Calendar cells: hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer
  - Workout indicators: bg-blue-500 text-white rounded-full w-5 h-5
  - Streak counters: bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300
  - Modal overlay: bg-black/50 backdrop-blur-sm

### Interaction Patterns

- **Calendar Navigation**: 
  - Hover: Subtle background color change on calendar cells
  - Click: Open workout detail modal or date selection
  - Keyboard: Arrow key navigation through dates
  - Accessibility: ARIA labels for calendar navigation

- **Workout Detail Modal**:
  - Open: Smooth modal slide-in animation
  - Close: Click outside, ESC key, or close button
  - Loading: Skeleton placeholder while fetching details
  - Accessibility: Focus trap and screen reader announcements

### Measurements and Spacing

- **Container**:
  ```
  max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6
  ```

- **Component Spacing**:
  ```
  - Calendar grid: grid-cols-7 gap-1 md:gap-2
  - Stats panel: grid-cols-2 md:grid-cols-4 gap-4 mb-6
  - Calendar cell: aspect-square p-2 md:p-3
  - Modal padding: p-6 md:p-8
  ```

### Responsive Behavior

- **Desktop (lg: 1024px+)**:
  ```
  - Full calendar grid with detailed indicators
  - Side-by-side stats and navigation
  - Large modal dialogs
  ```

- **Tablet (md: 768px - 1023px)**:
  ```
  - Compact calendar with smaller cells
  - Stacked stats layout
  - Medium-sized modals
  ```

- **Mobile (sm: < 768px)**:
  ```
  - Minimal calendar with dot indicators
  - Single-column stats
  - Full-screen modals
  ```

## Technical Requirements

### Component Structure

```
src/routes/
├── index.tsx                      # Updated dashboard route
└── _dashboard/
    └── _components/
        ├── CalendarDashboard.tsx      # Main dashboard with IlamyCalendar
        ├── WorkoutEventRenderer.tsx   # Custom workout event display
        ├── WorkoutDetailModal.tsx     # Modal for workout details
        ├── WorkoutSummaryStats.tsx    # Summary statistics panel
        ├── WorkoutStreakCounter.tsx   # Streak tracking component
        └── useCalendarData.ts         # Custom hook for calendar data
```

### Required Components

- CalendarDashboard ⬜ (using IlamyCalendar)
- WorkoutEventRenderer ⬜ (custom event display)
- WorkoutDetailModal ⬜
- WorkoutSummaryStats ⬜
- WorkoutStreakCounter ⬜
- useCalendarData ⬜

### State Management Requirements

```typescript
interface CalendarState {
  // Date States
  currentDate: Date;
  selectedDate: Date | null;
  dateRange: {
    start: Date;
    end: Date;
  };
  
  // Data States
  workoutData: WorkoutCalendarData[];
  selectedWorkout: WorkoutSessionWithSets | null;
  isLoading: boolean;
  error: string | null;
  
  // UI States
  isModalOpen: boolean;
  calendarView: 'month' | 'rolling';
  
  // Stats States
  summaryStats: {
    totalWorkouts: number;
    currentStreak: number;
    lastWorkoutDate: Date | null;
    workoutsThisMonth: number;
  };
}

// Calendar Data Structure
interface WorkoutCalendarData {
  date: string; // ISO date string
  hasWorkout: boolean;
  workoutCount: number;
  totalSets: number;
  totalVolume: number;
  exerciseCount: number;
  sessionIds: string[];
  intensity: 'light' | 'moderate' | 'intense';
}

// State Updates
const actions = {
  setCurrentDate: (date: Date) => void;
  selectDate: (date: Date | null) => void;
  navigateMonth: (direction: 'prev' | 'next') => void;
  openWorkoutModal: (date: Date) => void;
  closeWorkoutModal: () => void;
  loadCalendarData: (dateRange: { start: Date; end: Date }) => Promise<void>;
  refreshData: () => Promise<void>;
}
```

## Acceptance Criteria

### Layout & Content

1. Calendar Dashboard Layout
   ```
   - Header with current month/period and navigation
   - Summary stats cards (workouts, streaks, last workout)
   - Calendar grid showing 30-day rolling window
   - Workout indicators on days with sessions
   - Clear distinction between workout and rest days
   ```

2. Calendar Grid Components
   ```
   - 7-column grid layout for days of week
   - Date numbers with workout indicators
   - Today's date clearly highlighted
   - Previous/current month date distinction
   - Responsive cell sizing
   ```

3. Workout Detail Modal
   ```
   - Session date and duration
   - List of exercises performed
   - Sets, reps, and weights for each exercise
   - Total volume and workout notes
   - Close and navigation controls
   ```

### Functionality

1. Calendar Dashboard View

   - [ ] Display rolling 30-day calendar from current date (e.g., Aug 25 - Sep 25 if today is Sep 25)
   - [ ] Show workout indicators on days with recorded sessions
   - [ ] Highlight today's date with distinct styling
   - [ ] Display summary stats: total workouts, current streak, last workout date

2. Calendar Navigation and Interaction

   - [ ] Navigate to previous/next 30-day periods
   - [ ] Click on workout days to view session details
   - [ ] Clear visual distinction between workout days and rest days
   - [ ] Responsive design that works on mobile and desktop

3. Workout History Details

   - [ ] Modal popup showing full workout details when calendar day is clicked
   - [ ] Display exercise list, sets, reps, and weights for selected workout
   - [ ] Show workout date, duration, and any notes
   - [ ] Navigation between workouts within the modal

4. Empty State Handling

   - [ ] Display clean, empty calendar for users with no workout history
   - [ ] Show motivational messaging encouraging users to log their first workout
   - [ ] Provide clear call-to-action button to start logging workouts
   - [ ] Summary stats show zeros appropriately (0 workouts, 0 streak, etc.)

### Navigation Rules

- Calendar updates automatically to show rolling 30-day window from current date
- Users can navigate to previous/next periods while maintaining 30-day window
- Clicking workout days opens detail modal with session information
- Modal can be closed via ESC key, click outside, or close button
- Calendar maintains focus and accessibility for keyboard navigation

### Error Handling

- Display loading states while fetching calendar data
- Show error messages if workout data fails to load
- Gracefully display empty calendar for users with no workout history
- Show motivational messaging for new users to encourage first workout
- Handle network timeouts and API errors with retry options

## Modified Files

```
src/routes/
├── index.tsx ⬜                       # Update to use CalendarDashboard
└── _dashboard/
    └── _components/
        ├── CalendarDashboard.tsx ⬜    # Main dashboard with IlamyCalendar
        ├── WorkoutEventRenderer.tsx ⬜ # Custom workout event renderer
        ├── WorkoutDetailModal.tsx ⬜   # Workout details popup
        ├── WorkoutSummaryStats.tsx ⬜  # Summary statistics
        ├── WorkoutStreakCounter.tsx ⬜ # Streak calculations
        └── useCalendarData.ts ⬜       # Data fetching hook

src/routes/
├── api.calendar-data.ts ⬜           # Calendar-optimized API endpoint
└── api.workout-details.ts ⬜         # Detailed workout API

src/lib/
├── types/
│   └── calendar.ts ⬜               # Calendar and workout event types
└── database/
    └── queries/
        └── calendar.ts ⬜           # Calendar data queries

src/styles.css ⬜                     # Add @source directive for ilamy Calendar
package.json ⬜                       # Add @ilamy/calendar dependency
```

## Status

🟨 IN PROGRESS

1. Setup & Configuration

   - [ ] Install @ilamy/calendar package
   - [ ] Configure Tailwind CSS v4 @source directive for calendar styles
   - [ ] Set up calendar-specific API endpoints
   - [ ] Define TypeScript interfaces for workout events and calendar data
   - [ ] Configure Day.js plugins required by ilamy Calendar

2. Data Layer Implementation

   - [ ] Implement calendar data queries with date range optimization
   - [ ] Create API endpoints for calendar view and workout details
   - [ ] Add rolling 30-day window calculation logic
   - [ ] Implement workout summary and streak calculations

3. Calendar Component Development

   - [ ] Build main CalendarDashboard component using IlamyCalendar
   - [ ] Create custom workout event rendering with renderEvent prop
   - [ ] Implement WorkoutDetailModal triggered by onEventClick
   - [ ] Build workout summary stats panel and integration

4. Feature Implementation

   - [ ] Add calendar navigation (previous/next periods)
   - [ ] Implement workout streak calculation logic
   - [ ] Create summary statistics display
   - [ ] Add responsive design and mobile optimization

5. Testing
   - [ ] Unit tests for calendar logic and date calculations
   - [ ] Integration tests for API endpoints
   - [ ] Component testing for calendar interactions
   - [ ] E2E testing for complete calendar workflow

## Dependencies

- **@ilamy/calendar** - Professional React calendar component with built-in event management
- Day.js for date manipulation and calculations (already included with ilamy Calendar)
- Existing workout session and set data APIs
- User authentication system for data filtering

## Related Stories

- GT-002 (Log Workout Sets) - Source data for calendar display
- GT-004 (Track Progress Over Time) - Complementary progress visualization

## Notes

### Technical Considerations

1. **ilamy Calendar Integration**: Use professional calendar component with built-in event management and customization
2. **Workout Events Mapping**: Transform workout sessions into CalendarEvent objects for display
3. **Rolling Window Logic**: Use calendar's onDateChange callback to manage 30-day rolling window
4. **Performance Optimization**: Load only summary data for calendar view, detailed data on demand
5. **Custom Event Rendering**: Use renderEvent prop to display workout-specific information
6. **Event Interaction**: Leverage onCellClick and onEventClick for workout detail modals
7. **Tailwind CSS v4 Integration**: Configure @source directive for ilamy Calendar styles

### Business Requirements

- Calendar view should be the primary dashboard experience for authenticated users
- Motivational elements like streaks and consistency percentages are crucial for user engagement
- Mobile experience is critical as users often check progress on mobile devices
- Performance should be optimized for quick dashboard loading

### API Integration

#### Type Definitions

```typescript
interface WorkoutCalendarData {
  date: string;
  hasWorkout: boolean;
  workoutCount: number;
  totalSets: number;
  totalVolume: number;
  exerciseCount: number;
  sessionIds: string[];
  intensity: 'light' | 'moderate' | 'intense';
  duration?: number; // in minutes
}

interface CalendarDataRequest {
  userId: string;
  startDate: string;
  endDate: string;
  includeDetails?: boolean;
}

interface CalendarDataResponse {
  success: boolean;
  data: {
    calendarData: WorkoutCalendarData[];
    summaryStats: {
      totalWorkouts: number;
      currentStreak: number;
      longestStreak: number;
      lastWorkoutDate: string | null;
      workoutsThisMonth: number;
      averageWorkoutsPerWeek: number;
    };
    dateRange: {
      start: string;
      end: string;
    };
  };
  error?: string;
}

interface WorkoutDetailRequest {
  userId: string;
  date: string;
}

interface CalendarState {
  currentDate: Date;
  selectedDate: Date | null;
  workoutData: Map<string, WorkoutCalendarData>;
  summaryStats: CalendarSummaryStats;
  isLoading: boolean;
  error: string | null;
  isModalOpen: boolean;
}
```

### ilamy Calendar Integration

```typescript
// Workout event transformation for ilamy Calendar
interface WorkoutEvent extends CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  backgroundColor?: string;
  color?: string;
  allDay?: boolean;
  data?: {
    sessionId: string;
    exerciseCount: number;
    totalSets: number;
    totalVolume: number;
    duration?: number;
    intensity: 'light' | 'moderate' | 'intense';
  };
}

// Transform workout sessions to calendar events
const transformWorkoutToEvent = (workoutData: WorkoutCalendarData): WorkoutEvent => {
  const date = new Date(workoutData.date);
  
  return {
    id: `workout-${workoutData.date}`,
    title: `${workoutData.exerciseCount} exercises`,
    start: date,
    end: date,
    allDay: true,
    description: `${workoutData.totalSets} sets • ${workoutData.totalVolume}kg volume`,
    backgroundColor: getIntensityColor(workoutData.intensity),
    color: 'white',
    data: {
      sessionId: workoutData.sessionIds[0], // Primary session
      exerciseCount: workoutData.exerciseCount,
      totalSets: workoutData.totalSets,
      totalVolume: workoutData.totalVolume,
      duration: workoutData.duration,
      intensity: workoutData.intensity
    }
  };
};

// Custom event rendering component
const WorkoutEventRenderer = ({ event }: { event: WorkoutEvent }) => (
  <div className="px-1 py-0.5 text-xs font-medium text-white rounded">
    <div className="truncate">{event.title}</div>
    {event.data?.totalSets && (
      <div className="text-[10px] opacity-90">
        {event.data.totalSets} sets
      </div>
    )}
  </div>
);
```

### Custom Hook Implementation

```typescript
const useCalendarData = (userId: string) => {
  const [state, setState] = useState<CalendarState>({
    currentDate: new Date(),
    selectedDate: null,
    workoutData: new Map(),
    summaryStats: defaultStats,
    isLoading: false,
    error: null,
    isModalOpen: false,
  });

  // Calculate rolling 30-day window
  const calculateDateRange = useCallback((baseDate: Date = new Date()) => {
    const endDate = dayjs(baseDate);
    const startDate = endDate.subtract(29, 'days'); // 30 days total including today
    
    return {
      start: startDate.format('YYYY-MM-DD'),
      end: endDate.format('YYYY-MM-DD')
    };
  }, []);

  const fetchCalendarData = useCallback(async (baseDate?: Date) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { start, end } = calculateDateRange(baseDate);
      const params = new URLSearchParams({
        userId,
        startDate: start,
        endDate: end,
        includeDetails: 'false'
      });

      const response = await fetch(`/api/calendar-data?${params}`);
      if (!response.ok) throw new Error('Failed to fetch calendar data');
      
      const result = await response.json();
      
      if (result.success) {
        // Convert array to Map for O(1) lookup
        const dataMap = new Map<string, WorkoutCalendarData>();
        result.data.calendarData.forEach((item: WorkoutCalendarData) => {
          dataMap.set(item.date, item);
        });

        setState(prev => ({
          ...prev,
          workoutData: dataMap,
          summaryStats: result.data.summaryStats,
          isLoading: false
        }));
      } else {
        throw new Error(result.error || 'Unknown error');
      }
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, [userId, calculateDateRange]);

  // Navigate calendar periods
  const navigatePeriod = useCallback((direction: 'prev' | 'next') => {
    const currentDate = state.currentDate;
    const newDate = direction === 'next' 
      ? dayjs(currentDate).add(30, 'days').toDate()
      : dayjs(currentDate).subtract(30, 'days').toDate();
    
    setState(prev => ({ ...prev, currentDate: newDate }));
    fetchCalendarData(newDate);
  }, [state.currentDate, fetchCalendarData]);

  // Get workout data for specific date
  const getWorkoutForDate = useCallback((date: Date): WorkoutCalendarData | null => {
    const dateStr = dayjs(date).format('YYYY-MM-DD');
    return state.workoutData.get(dateStr) || null;
  }, [state.workoutData]);

  // Calculate current streak
  const calculateStreak = useCallback((): number => {
    const today = dayjs();
    let streak = 0;
    let currentDate = today;

    // Check backwards from today
    while (streak < 365) { // Max check 1 year
      const dateStr = currentDate.format('YYYY-MM-DD');
      const workoutData = state.workoutData.get(dateStr);
      
      if (workoutData?.hasWorkout) {
        streak++;
        currentDate = currentDate.subtract(1, 'day');
      } else {
        break;
      }
    }

    return streak;
  }, [state.workoutData]);

  // Initialize data on mount and when userId changes
  useEffect(() => {
    if (userId) {
      fetchCalendarData();
    }
  }, [userId, fetchCalendarData]);

  return {
    ...state,
    navigatePeriod,
    getWorkoutForDate,
    calculateStreak,
    refetch: () => fetchCalendarData(),
    selectDate: (date: Date | null) => setState(prev => ({ ...prev, selectedDate: date })),
    openModal: () => setState(prev => ({ ...prev, isModalOpen: true })),
    closeModal: () => setState(prev => ({ ...prev, isModalOpen: false, selectedDate: null })),
  };
};
```

## Testing Requirements

### Integration Tests (Target: 80% Coverage)

1. Calendar Data Tests

```typescript
describe('Calendar Data Integration', () => {
  it('should load calendar data for rolling 30-day window', async () => {
    // Test calendar data loading for current period
  });

  it('should calculate correct date ranges for different base dates', async () => {
    // Test rolling window calculation logic
  });

  it('should handle navigation between calendar periods', async () => {
    // Test period navigation functionality
  });
});
```

2. Calendar Interaction Tests

```typescript
describe('Calendar Interactions', () => {
  it('should open workout detail modal when clicking workout days', async () => {
    // Test modal opening functionality
  });

  it('should display correct workout indicators for each day', async () => {
    // Test workout indicator display
  });

  it('should calculate and display streaks correctly', async () => {
    // Test streak calculation logic
  });
});
```

3. Edge Cases

```typescript
describe('Calendar Edge Cases', () => {
  it('should handle month boundaries correctly', async () => {
    // Test month transition edge cases
  });

  it('should handle users with no workout history', async () => {
    // Test empty state display
  });

  it('should handle timezone differences properly', async () => {
    // Test timezone handling
  });
});
```

### Performance Tests

1. Calendar Loading Performance

```typescript
describe('Calendar Performance', () => {
  it('should load calendar data efficiently', async () => {
    // Test calendar data loading performance
  });

  it('should handle large workout datasets without lag', async () => {
    // Test performance with extensive workout history
  });
});
```

### Accessibility Tests

```typescript
describe('Calendar Accessibility', () => {
  it('should provide accessible calendar navigation', async () => {
    // Test keyboard navigation and ARIA labels
  });

  it('should announce calendar changes to screen readers', async () => {
    // Test screen reader compatibility
  });
});
```