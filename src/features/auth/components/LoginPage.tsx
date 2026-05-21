import GoogleLoginButton from './GoogleLoginButton'

interface LoginPageProps {
  className?: string
}

const BENEFITS = [
  'Track your workout sessions',
  'Browse exercise database',
  'Monitor your progress',
  'View workout history',
]

export default function LoginPage({ className = '' }: LoginPageProps) {
  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center px-4 ${className}`}
    >
      <div className="w-full max-w-md">
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Gymmie</h1>
            <p className="text-gray-600">Track your fitness journey and achieve your goals</p>
          </div>

          <div className="space-y-4">
            <GoogleLoginButton className="w-full" />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Secure sign-in powered by Google
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">What you'll get:</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              {BENEFITS.map((benefit) => (
                <li key={benefit} className="flex items-center">
                  <CheckIcon />
                  {benefit}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="text-center mt-6">
          <p className="text-white/80 text-sm">Your fitness data is secure and private</p>
        </div>
      </div>
    </div>
  )
}

function CheckIcon() {
  return (
    <svg className="mr-2 h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
      <path
        fillRule="evenodd"
        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
        clipRule="evenodd"
      />
    </svg>
  )
}
