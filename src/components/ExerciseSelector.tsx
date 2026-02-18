import { useState, useEffect } from 'react';
import type { ExerciseWithParsedFields } from '../lib/database';

interface ExerciseSelectorProps {
  onSelectExercise: (exercise: ExerciseWithParsedFields) => void;
  selectedExercise?: ExerciseWithParsedFields | null;
  className?: string;
}

export default function ExerciseSelector({ 
  onSelectExercise, 
  selectedExercise, 
  className = '' 
}: ExerciseSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [exercises, setExercises] = useState<ExerciseWithParsedFields[]>([]);
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [equipmentTypes, setEquipmentTypes] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load initial data
  useEffect(() => {
    loadCategories();
    loadEquipmentTypes();
    searchExercises();
  }, []);

  // Search when filters change
  useEffect(() => {
    searchExercises();
  }, [searchQuery, selectedCategory, selectedEquipment]);

  const loadCategories = async () => {
    try {
      const response = await fetch('/api/exercise-categories');
      const data = await response.json();
      setCategories(data.data || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadEquipmentTypes = async () => {
    try {
      const response = await fetch('/api/equipment-types');
      const data = await response.json();
      setEquipmentTypes(data.data || []);
    } catch (error) {
      console.error('Failed to load equipment types:', error);
    }
  };

  const searchExercises = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.append('query', searchQuery);
      if (selectedCategory) params.append('category_id', selectedCategory);
      if (selectedEquipment) params.append('equipment', selectedEquipment);
      params.append('limit', '20');

      const response = await fetch(`/api/exercises/search?${params.toString()}`);
      const data = await response.json();
      setExercises(data.data || []);
    } catch (error) {
      console.error('Failed to search exercises:', error);
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectExercise = (exercise: ExerciseWithParsedFields) => {
    onSelectExercise(exercise);
    setIsOpen(false);
  };

  const clearSelection = () => {
    onSelectExercise(null as any);
    setSearchQuery('');
    setSelectedCategory('');
    setSelectedEquipment('');
  };

  return (
    <div className={`relative ${className}`}>
      {/* Selected Exercise Display */}
      {selectedExercise ? (
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">{selectedExercise.name}</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {selectedExercise.category_name} • {selectedExercise.equipment || 'No equipment'}
              </p>
              {selectedExercise.primary_muscles.length > 0 && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
                  Primary: {selectedExercise.primary_muscles.join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIsOpen(true)}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 border border-blue-300 dark:border-blue-600 px-3 py-1 rounded-lg text-sm font-medium hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
              >
                Change
              </button>
              <button
                onClick={clearSelection}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Exercise Selection Interface */
        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-4 hover:border-blue-400 dark:hover:border-blue-500 transition-colors">
          <button
            onClick={() => setIsOpen(true)}
            className="w-full text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center justify-center gap-2 py-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Select an exercise
          </button>
        </div>
      )}

      {/* Exercise Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Select Exercise</h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name or muscle group..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
                />
              </div>

              {/* Filters Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Equipment Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Equipment
                  </label>
                  <select
                    value={selectedEquipment}
                    onChange={(e) => setSelectedEquipment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">All Equipment</option>
                    {equipmentTypes.map((equipment) => (
                      <option key={equipment} value={equipment}>
                        {equipment}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Exercise List */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : exercises.length > 0 ? (
                <div className="space-y-3">
                  {exercises.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => handleSelectExercise(exercise)}
                      className="w-full p-4 text-left border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 group"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{exercise.name}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {exercise.category_name} • {exercise.equipment || 'No equipment'}
                          </p>
                          {exercise.primary_muscles.length > 0 && (
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              {exercise.primary_muscles.join(', ')}
                            </p>
                          )}
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  No exercises found. Try adjusting your search criteria.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}