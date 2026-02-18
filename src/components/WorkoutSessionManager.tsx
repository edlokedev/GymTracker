import { useState, useEffect } from 'react';
import ExerciseSelector from './ExerciseSelector';
import SetEntry from './SetEntry';
import type { 
  WorkoutSession, 
  WorkoutSet, 
  ExerciseWithParsedFields, 
  WorkoutSessionInput, 
  WorkoutSetInput 
} from '../lib/database';

interface WorkoutSessionManagerProps {
  userId: string;
  existingSession?: WorkoutSession;
  onSessionSave?: (session: WorkoutSession) => void;
  onSessionComplete?: (session: WorkoutSession) => void;
  className?: string;
}

interface ExerciseInWorkout {
  exercise: ExerciseWithParsedFields;
  sets: WorkoutSet[];
}

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

function ConfirmModal({ 
  isOpen, 
  title, 
  message, 
  confirmText = 'Confirm', 
  cancelText = 'Cancel',
  onConfirm, 
  onCancel 
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          {title}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-medium transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function WorkoutSessionManager({
  userId,
  existingSession,
  onSessionSave,
  onSessionComplete,
  className = ''
}: WorkoutSessionManagerProps) {
  const [session, setSession] = useState<WorkoutSession | null>(existingSession || null);
  const [exercises, setExercises] = useState<ExerciseInWorkout[]>([]);
  const [sessionName, setSessionName] = useState(existingSession?.name || '');
  const [sessionNotes, setSessionNotes] = useState(existingSession?.notes || '');
  const [selectedExercise, setSelectedExercise] = useState<ExerciseWithParsedFields | null>(null);
  const [isSessionStarted, setIsSessionStarted] = useState(!!existingSession);
  const [sessionStartTime] = useState(existingSession?.start_time || new Date().toISOString());
  const [loading, setLoading] = useState(false);
  
  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Load existing session data
  useEffect(() => {
    if (existingSession) {
      loadSessionData(existingSession.id);
    }
  }, [existingSession]);

  const loadSessionData = async (sessionId: string) => {
    try {
      setLoading(true);
      
      // Load workout sets for this session
      const response = await fetch(`/api/workout-sets?workoutId=${sessionId}`);
      if (!response.ok) {
        throw new Error(`Failed to load session data: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to load session data');
      }

      const sets = result.data || [];
      
      // Group sets by exercise and load exercise details
      const exerciseGroups = new Map();
      
      for (const set of sets) {
        if (!exerciseGroups.has(set.exercise_id)) {
          // Load exercise details - this would need an exercise API endpoint
          // For now, we'll create a placeholder structure
          exerciseGroups.set(set.exercise_id, {
            exercise: {
              id: set.exercise_id,
              name: 'Loading...', // This would be loaded from exercise API
              category_name: 'Unknown',
              equipment: 'Unknown',
              primary_muscles: []
            },
            sets: []
          });
        }
        exerciseGroups.get(set.exercise_id).sets.push(set);
      }
      
      setExercises(Array.from(exerciseGroups.values()));
    } catch (error) {
      console.error('Failed to load session data:', error);
      // Start with empty exercises array if loading fails
      setExercises([]);
    } finally {
      setLoading(false);
    }
  };

  const startSession = async () => {
    try {
      setLoading(true);
      
      const sessionData: WorkoutSessionInput = {
        user_id: userId,
        name: sessionName.trim() || undefined,
        date: new Date().toISOString().split('T')[0],
        notes: sessionNotes.trim() || undefined,
        start_time: sessionStartTime
      };

      // Create workout session via API
      const response = await fetch('/api/workout-sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create session: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to create session');
      }

      const newSession = result.data;
      setSession(newSession);
      setIsSessionStarted(true);
      
      if (onSessionSave) {
        onSessionSave(newSession);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
      alert('Failed to start workout session');
    } finally {
      setLoading(false);
    }
  };

  const updateSession = async () => {
    if (!session) return;

    try {
      const updates = {
        name: sessionName.trim() || undefined,
        notes: sessionNotes.trim() || undefined
      };

      const response = await fetch(`/api/workout-sessions?id=${session.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        throw new Error(`Failed to update session: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update session');
      }

      const updatedSession = result.data;
      setSession(updatedSession);
      
      if (onSessionSave) {
        onSessionSave(updatedSession);
      }
    } catch (error) {
      console.error('Failed to update session:', error);
    }
  };

  const completeSession = async () => {
    if (!session) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/workout-sessions?id=${session.id}&action=complete`, {
        method: 'PATCH'
      });

      if (!response.ok) {
        throw new Error(`Failed to complete session: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to complete session');
      }

      const completedSession = result.data;
      setSession(completedSession);
      
      if (onSessionComplete) {
        onSessionComplete(completedSession);
      }
    } catch (error) {
      console.error('Failed to complete session:', error);
      alert('Failed to complete workout session');
    } finally {
      setLoading(false);
    }
  };

  const addExercise = (exercise: ExerciseWithParsedFields) => {
    const existingIndex = exercises.findIndex(e => e.exercise.id === exercise.id);
    
    if (existingIndex >= 0) {
      // Exercise already exists, don't add again
      alert('This exercise is already in your workout');
      return;
    }

    const newExerciseInWorkout: ExerciseInWorkout = {
      exercise,
      sets: []
    };

    setExercises(prev => [...prev, newExerciseInWorkout]);
    setSelectedExercise(null);
  };

  const removeExercise = (exerciseId: string) => {
    const exerciseToRemove = exercises.find(e => e.exercise.id === exerciseId);
    const exerciseName = exerciseToRemove?.exercise.name || 'this exercise';
    
    setConfirmModal({
      isOpen: true,
      title: 'Remove Exercise',
      message: `Are you sure you want to remove "${exerciseName}" and all its sets from your workout?`,
      onConfirm: () => {
        setExercises(prev => prev.filter(e => e.exercise.id !== exerciseId));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const saveSet = async (exerciseId: string, setData: WorkoutSetInput) => {
    if (!session) return;

    try {
      const response = await fetch('/api/workout-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setData)
      });

      if (!response.ok) {
        throw new Error(`Failed to save set: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to save set');
      }

      const newSet = result.data;
      console.log('Saved set:', newSet);

      // Update local state
      setExercises(prev => prev.map(exercise => {
        if (exercise.exercise.id === exerciseId) {
          const updatedExercise = {
            ...exercise,
            sets: [...exercise.sets, newSet]
          };
          console.log('Updated exercise with sets:', updatedExercise);
          return updatedExercise;
        }
        return exercise;
      }));
    } catch (error) {
      console.error('Failed to save set:', error);
      alert('Failed to save set');
    }
  };

  const deleteSet = async (exerciseId: string, setId: string) => {
    try {
      const response = await fetch(`/api/workout-sets?id=${setId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete set: ${response.status}`);
      }

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to delete set');
      }

      // Update local state
      setExercises(prev => prev.map(exercise => {
        if (exercise.exercise.id === exerciseId) {
          return {
            ...exercise,
            sets: exercise.sets.filter(set => set.id !== setId)
          };
        }
        return exercise;
      }));
    } catch (error) {
      console.error('Failed to delete set:', error);
      alert('Failed to delete set');
    }
  };

  const getTotalSets = () => {
    return exercises.reduce((total, exercise) => total + exercise.sets.length, 0);
  };

  const getTotalVolume = () => {
    return exercises.reduce((total, exercise) => {
      return total + exercise.sets.reduce((exerciseTotal, set) => {
        return exerciseTotal + ((set.weight || 0) * (set.reps || 0));
      }, 0);
    }, 0);
  };

  const getSessionDuration = () => {
    if (!session?.start_time) return null;
    
    const start = new Date(session.start_time);
    const end = session.end_time ? new Date(session.end_time) : new Date();
    const durationMs = end.getTime() - start.getTime();
    const minutes = Math.floor(durationMs / (1000 * 60));
    
    if (minutes < 60) {
      return `${minutes}m`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  return (
    <div className={`space-y-4 sm:space-y-6 ${className}`}>
      {/* Session Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
            {isSessionStarted ? 'Active Workout' : 'New Workout'}
          </h1>
          {session?.end_time && (
            <span className="bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 px-3 py-1 rounded-full text-sm font-medium">
              Completed
            </span>
          )}
        </div>

        {/* Session Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Workout Name
            </label>
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              onBlur={updateSession}
              placeholder="e.g., Push Day, Legs, etc."
              disabled={!!session?.end_time}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Notes
            </label>
            <textarea
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              onBlur={updateSession}
              placeholder="How are you feeling? Any goals for this workout?"
              rows={2}
              disabled={!!session?.end_time}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 dark:disabled:bg-gray-600 placeholder-gray-500 dark:placeholder-gray-400"
            />
          </div>

          {/* Session Stats */}
          {isSessionStarted && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{getTotalSets()}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Sets</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {getTotalVolume().toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Volume (kg)</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {getSessionDuration() || '0m'}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Duration</div>
              </div>
            </div>
          )}
        </div>

        {/* Session Actions */}
        <div className="flex gap-3 mt-6">
          {!isSessionStarted ? (
            <button
              onClick={startSession}
              disabled={loading}
              className="bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Starting...' : 'Start Workout'}
            </button>
          ) : !session?.end_time ? (
            <button
              onClick={completeSession}
              disabled={loading || getTotalSets() === 0}
              className="bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white px-6 py-3 rounded-xl font-medium shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Completing...' : 'Complete Workout'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Exercise Selection */}
      {isSessionStarted && !session?.end_time && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Add Exercise</h2>
          <ExerciseSelector
            onSelectExercise={addExercise}
            selectedExercise={selectedExercise}
          />
        </div>
      )}

      {/* Exercises and Sets */}
      {exercises.length > 0 && (
        <div className="space-y-4 sm:space-y-6">
          {exercises.map((exerciseInWorkout) => (
            <div key={exerciseInWorkout.exercise.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{exerciseInWorkout.exercise.name}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {exerciseInWorkout.exercise.category_name} • {exerciseInWorkout.exercise.equipment || 'No equipment'}
                  </p>
                  {exerciseInWorkout.exercise.primary_muscles.length > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                      Primary: {exerciseInWorkout.exercise.primary_muscles.join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {!session?.end_time && (
                    <button
                      type="button"
                      onClick={() => removeExercise(exerciseInWorkout.exercise.id)}
                      className="bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 px-3 py-2 rounded-lg font-medium transition-colors duration-200 border border-red-300 dark:border-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>

              {/* Existing Sets */}
              <div className="space-y-3 mb-4">
                {exerciseInWorkout.sets.map((set) => (
                  <SetEntry
                    key={set.id}
                    exerciseId={exerciseInWorkout.exercise.id}
                    workoutId={session?.id}
                    existingSet={set}
                    setNumber={set.set_number}
                    onSave={() => {}} // Read-only for existing sets
                    onDelete={!session?.end_time ? () => deleteSet(exerciseInWorkout.exercise.id, set.id) : undefined}
                  />
                ))}
              </div>

              {/* New Set Entry */}
              {!session?.end_time && (
                <SetEntry
                  exerciseId={exerciseInWorkout.exercise.id}
                  workoutId={session?.id}
                  setNumber={exerciseInWorkout.sets.length + 1}
                  onSave={(setData) => saveSet(exerciseInWorkout.exercise.id, setData)}
                  key={`new-set-${exerciseInWorkout.exercise.id}-${exerciseInWorkout.sets.length}`}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {isSessionStarted && exercises.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-8 sm:p-12 text-center shadow-sm">
          <svg className="w-16 h-16 text-gray-400 dark:text-gray-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No exercises added yet</h3>
          <p className="text-gray-600 dark:text-gray-400">Add your first exercise to start tracking your workout.</p>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText="Remove"
        cancelText="Cancel"
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
}