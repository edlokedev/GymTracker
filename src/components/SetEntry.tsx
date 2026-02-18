import { useState, useEffect } from 'react';
import type { WorkoutSet, WorkoutSetInput } from '../lib/database';

interface SetEntryProps {
  exerciseId?: string;
  workoutId?: string;
  existingSet?: WorkoutSet;
  setNumber: number;
  onSave: (setData: WorkoutSetInput) => void;
  onDelete?: () => void;
  className?: string;
}

export default function SetEntry({
  exerciseId,
  workoutId,
  existingSet,
  setNumber,
  onSave,
  onDelete,
  className = ''
}: SetEntryProps) {
  const [reps, setReps] = useState<string>(existingSet?.reps?.toString() || '');
  const [weight, setWeight] = useState<string>(existingSet?.weight?.toString() || '');
  const [restTime, setRestTime] = useState<string>(existingSet?.rest_time?.toString() || '');
  const [notes, setNotes] = useState<string>(existingSet?.notes || '');
  const [isSaved, setIsSaved] = useState(!!existingSet);
  const [isEditing, setIsEditing] = useState(!existingSet);

  // Update form when existingSet changes
  useEffect(() => {
    if (existingSet) {
      setReps(existingSet.reps?.toString() || '');
      setWeight(existingSet.weight?.toString() || '');
      setRestTime(existingSet.rest_time?.toString() || '');
      setNotes(existingSet.notes || '');
      setIsSaved(true);
      setIsEditing(false);
    }
  }, [existingSet]);

  const handleSave = () => {
    if (!exerciseId || !workoutId) {
      console.error('Cannot save set: missing exerciseId or workoutId');
      return;
    }

    const repsNum = parseInt(reps, 10);
    const weightNum = parseFloat(weight);
    const restTimeNum = restTime ? parseInt(restTime, 10) : undefined;

    // Validate that at least reps is provided (weight can be optional for bodyweight exercises)
    if (!reps || isNaN(repsNum) || repsNum <= 0) {
      alert('Please enter a valid number of reps');
      return;
    }

    // If weight is provided, validate it
    if (weight && (isNaN(weightNum) || weightNum < 0)) {
      alert('Please enter a valid weight');
      return;
    }

    // Prevent duplicate submissions
    if (isSaved && !existingSet) {
      console.log('Set already saved, skipping duplicate submission');
      return;
    }

    const setData: WorkoutSetInput = {
      workout_id: workoutId,
      exercise_id: exerciseId,
      set_order: setNumber,
      reps: repsNum,
      weight: weight && !isNaN(weightNum) && weightNum > 0 ? weightNum : undefined,
      rest_time: restTimeNum,
      notes: notes.trim() || undefined
    };

    onSave(setData);
    
    // If this is a new set (no existingSet), clear the form for the next set
    if (!existingSet) {
      setReps('');
      setWeight('');
      setRestTime('');
      setNotes('');
      setIsSaved(false);
      setIsEditing(true);
    } else {
      setIsSaved(true);
      setIsEditing(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancel = () => {
    if (existingSet) {
      // Revert to saved values
      setReps(existingSet.reps?.toString() || '');
      setWeight(existingSet.weight?.toString() || '');
      setRestTime(existingSet.rest_time?.toString() || '');
      setNotes(existingSet.notes || '');
      setIsEditing(false);
    } else {
      // Clear new set
      setReps('');
      setWeight('');
      setRestTime('');
      setNotes('');
    }
  };

  const formatRestTime = (seconds: number): string => {
    if (seconds < 60) {
      return `${seconds}s`;
    }
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  };

  const isFormValid = reps && parseInt(reps, 10) > 0;

  return (
    <div className={`border rounded-xl p-4 transition-all duration-200 ${
      isSaved 
        ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-700 shadow-sm' 
        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md'
    } ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900 dark:text-white">Set {setNumber}</h4>
        {isSaved && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm px-2 py-1 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              Edit
            </button>
            {onDelete && (
              <button
                onClick={onDelete}
                className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 text-sm px-2 py-1 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>

      {isEditing ? (
        /* Editing Mode */
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {/* Reps */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Reps *
              </label>
              <input
                type="number"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                placeholder="0"
                min="1"
                max="100"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>

            {/* Weight */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0"
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
          </div>

          {/* Rest Time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Rest Time (seconds)
            </label>
            <input
              type="number"
              value={restTime}
              onChange={(e) => setRestTime(e.target.value)}
              placeholder="60"
              min="0"
              step="5"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this set..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={!isFormValid}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-4 py-2 rounded-lg font-medium shadow-sm hover:shadow-md active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-blue-500"
            >
              {existingSet ? 'Update' : 'Save'} Set
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 border border-gray-300 dark:border-gray-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        /* Display Mode */
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Reps:</span>
              <span className="ml-2 font-semibold text-gray-900 dark:text-white">{reps}</span>
            </div>
            {weight && (
              <div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Weight:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">{weight} kg</span>
              </div>
            )}
          </div>
          
          {restTime && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Rest:</span>
              <span className="ml-2 text-gray-900 dark:text-white">{formatRestTime(parseInt(restTime, 10))}</span>
            </div>
          )}
          
          {notes && (
            <div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Notes:</span>
              <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">{notes}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}