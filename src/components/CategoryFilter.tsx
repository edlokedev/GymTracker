interface ExerciseCategory {
  id: string
  name: string
  description?: string
  exercise_count: number
}

interface CategoryFilterProps {
  categories: ExerciseCategory[]
  selectedCategory: string | null
  onSelectCategory: (categoryId: string | null) => void
}

export default function CategoryFilter({
  categories,
  selectedCategory,
  onSelectCategory,
}: CategoryFilterProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Category
      </label>
      
      <div className="space-y-1">
        {/* All Categories Option */}
        <button
          onClick={() => onSelectCategory(null)}
          className={`
            w-full text-left px-3 py-2 rounded-lg text-sm transition-colors
            ${selectedCategory === null
              ? 'bg-blue-500 text-white'
              : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
            }
          `}
        >
          <div className="flex items-center justify-between">
            <span>All Categories</span>
            <span className="text-xs opacity-75">
              {categories.reduce((total, cat) => total + cat.exercise_count, 0)}
            </span>
          </div>
        </button>

        {/* Individual Categories */}
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => onSelectCategory(category.id)}
            className={`
              w-full text-left px-3 py-2 rounded-lg text-sm transition-all duration-200
              ${selectedCategory === category.id
                ? 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white shadow-md'
                : 'bg-gray-100 hover:bg-gradient-to-r hover:from-gray-200 hover:to-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
              }
            `}
          >
            <div className="flex items-center justify-between">
              <span className="capitalize">{category.name}</span>
              <span className="text-xs opacity-75">
                {category.exercise_count}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}