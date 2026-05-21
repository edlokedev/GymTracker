import { ScrollArea } from '@/components/ui/ScrollArea'

export interface ExerciseFacetOption {
  id: string
  label: string
  count?: number
}

interface ExerciseFacetFilterProps {
  title: string
  options: ExerciseFacetOption[]
  selectedValues: string[]
  onToggle: (value: string) => void
}

export default function ExerciseFacetFilter({
  title,
  options,
  selectedValues,
  onToggle,
}: ExerciseFacetFilterProps) {
  const selectedSet = new Set(selectedValues)

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400">
          {title}
        </h3>
        {selectedValues.length > 0 && (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
            {selectedValues.length}
          </span>
        )}
      </div>

      <ScrollArea className="-mr-1 max-h-60 space-y-1.5 overflow-y-auto pr-1">
        {options.map((option) => {
          const isSelected = selectedSet.has(option.id)

          return (
            <button
              type="button"
              key={option.id}
              aria-pressed={isSelected}
              onClick={() => onToggle(option.id)}
              className={`group flex min-h-9 w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-sm transition-all ${
                isSelected
                  ? 'border-blue-300 bg-blue-50 text-blue-800 shadow-sm shadow-blue-950/5 ring-1 ring-blue-200/70 dark:border-blue-400/40 dark:bg-blue-500/15 dark:text-blue-50 dark:ring-blue-400/20'
                  : 'border-gray-200 bg-gray-50/80 text-gray-700 hover:border-gray-300 hover:bg-white hover:shadow-sm dark:border-slate-700/70 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800'
              }`}
            >
              <span className="min-w-0 flex-1 truncate">{option.label}</span>
              {typeof option.count === 'number' && (
                <span
                  className={`rounded-full px-2 py-0.5 tabular-nums text-xs font-medium ${
                    isSelected
                      ? 'bg-white/75 text-blue-700 dark:bg-blue-950/60 dark:text-blue-100'
                      : 'bg-white text-gray-500 dark:bg-slate-900/80 dark:text-slate-400'
                  }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
      </ScrollArea>
    </section>
  )
}
