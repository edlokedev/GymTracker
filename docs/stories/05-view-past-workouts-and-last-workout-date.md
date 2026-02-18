# User Story: 5 - View Past Workouts and Last Workout Date

**As a** gym user,
**I want** to view my past workouts in a calendar format and see when I last worked out,
**so that** I can review my workout history and maintain consistency in my training schedule.

## Acceptance Criteria

### Calendar Dashboard View
* Dashboard displays a calendar format showing the last rolling 1 month from current date
* Example: If today is September 25th, 2025, calendar shows from August 25th to September 25th, 2025
* Each calendar day shows workout indicator/summary if a workout was performed that day
* User can see at a glance which days they worked out and which days they missed
* Calendar clearly highlights the most recent workout date

### Workout History Details
* User can access a detailed list of their past workout sessions
* Each past workout shows the date, exercises performed, and sets completed
* Past workouts are organized chronologically (most recent first)
* User can view full details of any specific past workout by clicking on calendar days
* System displays workout frequency patterns over the rolling month period

### Navigation and Interaction
* User can navigate through workout history easily
* Calendar allows navigation to previous/next month periods
* Clicking on a workout day opens detailed workout information
* Empty days are clearly distinguishable from workout days

## Notes

### Calendar Implementation
* Calendar should use a rolling 30-day window that updates daily
* Visual indicators for workout days vs. rest days (e.g., colored dots, different backgrounds)
* Calendar should be responsive and work well on mobile devices
* Consider showing workout intensity or duration as visual cues (e.g., different colors/sizes)

### Data and Performance
* This feature supports workout consistency and motivation
* Consider showing workout streaks or gaps between sessions
* Past workout data should be comprehensive enough to recreate the session details
* Last workout date is important for maintaining training momentum
* Calendar should load efficiently with workout summary data (not full details)
* Full workout details loaded only when user clicks on specific days

### User Experience
* Calendar should be the primary view on dashboard for authenticated users
* Provide quick summary stats like "X workouts this month" or "Last workout: Y days ago"
* Consider adding motivational elements like streak counters or consistency percentages