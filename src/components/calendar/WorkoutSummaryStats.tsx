// React import omitted (automatic runtime)

interface WorkoutSummaryStatsProps {
  stats: {
    totalWorkouts: number;
    totalVolume: number;
    averageWorkoutsPerWeek: number;
    longestStreak: number;
    currentStreak: number;
    lastWorkoutDate: string | null;
    workoutsThisMonth: number;
  };
  isLoading: boolean;
}

export function WorkoutSummaryStats({ stats, isLoading }: WorkoutSummaryStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="workout-stat">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const formatLastWorkout = (date: string | null) => {
    if (!date) return 'Never';
    
    const workoutDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - workoutDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return workoutDate.toLocaleDateString();
  };

  const statCards = [
    {
      title: 'Total Workouts',
      value: stats.totalWorkouts.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    },
    {
      title: 'Current Streak',
      value: `${stats.currentStreak} days`,
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      color: 'text-orange-600 dark:text-orange-400',
      bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    },
    {
      title: 'This Month',
      value: stats.workoutsThisMonth.toString(),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V6a2 2 0 012-2h4a2 2 0 012 2v1m-6 0h6m-6 0a2 2 0 00-2 2v8a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2m-6 0h6" />
        </svg>
      ),
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
    },
    {
      title: 'Last Workout',
      value: formatLastWorkout(stats.lastWorkoutDate),
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
      {statCards.map((stat) => (
        <div
          key={stat.title}
          className="workout-stat min-h-[100px] sm:min-h-[120px]"
        >
          <div className="flex items-start justify-between h-full">
            <div className="flex-1 min-w-0">
              <p className="text-xs sm:text-sm font-medium truncate" style={{ color: 'var(--color-text-secondary)' }}>
                {stat.title}
              </p>
              <p className="text-lg sm:text-xl font-bold mt-1 gradient-text">
                {stat.value}
              </p>
            </div>
            <div className={`p-2 rounded-lg ${stat.bgColor}`}>
              <div className={`w-4 h-4 sm:w-5 sm:h-5 ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}