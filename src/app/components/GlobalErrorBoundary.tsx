export function GlobalErrorBoundary({ error, reset }: { error: Error; reset?: () => void }) {
  // Hard navigation home. The root shell (including auth state) is rebuilt on
  // the full page load, so a router.invalidate() here would be a no-op race.
  const goHome = () => {
    window.location.href = '/'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 border-t-4 border-red-500">
      <main className="max-w-4xl mx-auto px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden text-center p-8 sm:p-12">
          <div className="mx-auto w-24 h-24 mb-6">
            <ErrorIcon />
          </div>

          <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight mb-4">
            Something went wrong
          </h1>

          <p className="text-lg text-gray-500 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            We've encountered an unexpected error. Please try refreshing the page or navigating back
            home.
          </p>

          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-left overflow-auto mb-8 border border-red-100 dark:border-red-800/30">
            <p className="text-sm font-mono text-red-800 dark:text-red-200 break-words">
              {error.message || 'Unknown Error'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {reset && (
              <button
                onClick={reset}
                className="inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-xl text-white bg-red-600 hover:bg-red-700 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Try Again
              </button>
            )}
            <button
              onClick={goHome}
              className="inline-flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-medium rounded-xl text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              Back to Home
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

function ErrorIcon() {
  return (
    <svg
      className="h-full w-full text-red-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}
