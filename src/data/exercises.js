// Default exercise list with body part mapping
export const BODY_PARTS = [
  'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body', 'Other'
];

export const EXERCISE_DEFAULTS = [
  // Chest
  { name: 'Push-Ups', bodyPart: 'Chest' },
  { name: 'Bench Press', bodyPart: 'Chest' },
  { name: 'Incline Bench Press', bodyPart: 'Chest' },
  { name: 'Dumbbell Fly', bodyPart: 'Chest' },
  { name: 'Cable Crossover', bodyPart: 'Chest' },
  { name: 'Decline Push-Ups', bodyPart: 'Chest' },
  { name: 'Diamond Push-Ups', bodyPart: 'Chest' },
  { name: 'Knee Push-Ups', bodyPart: 'Chest' },

  // Back
  { name: 'Pull-Ups', bodyPart: 'Back' },
  { name: 'Lat Pulldown', bodyPart: 'Back' },
  { name: 'Barbell Row', bodyPart: 'Back' },
  { name: 'Dumbbell Row', bodyPart: 'Back' },
  { name: 'Deadlift', bodyPart: 'Back' },
  { name: 'Face Pull', bodyPart: 'Back' },
  { name: 'Seated Cable Row', bodyPart: 'Back' },
  { name: 'Chin-Ups', bodyPart: 'Back' },
  { name: 'Inverted Row', bodyPart: 'Back' },

  // Legs
  { name: 'Squats', bodyPart: 'Legs' },
  { name: 'Goblet Squat', bodyPart: 'Legs' },
  { name: 'Bulgarian Split Squat', bodyPart: 'Legs' },
  { name: 'Lunges', bodyPart: 'Legs' },
  { name: 'Romanian Deadlift', bodyPart: 'Legs' },
  { name: 'Leg Press', bodyPart: 'Legs' },
  { name: 'Leg Extension', bodyPart: 'Legs' },
  { name: 'Leg Curl', bodyPart: 'Legs' },
  { name: 'Calf Raises', bodyPart: 'Legs' },
  { name: 'Step-Ups', bodyPart: 'Legs' },

  // Shoulders
  { name: 'Overhead Press', bodyPart: 'Shoulders' },
  { name: 'Lateral Raise', bodyPart: 'Shoulders' },
  { name: 'Front Raise', bodyPart: 'Shoulders' },
  { name: 'Rear Delt Fly', bodyPart: 'Shoulders' },
  { name: 'Arnold Press', bodyPart: 'Shoulders' },
  { name: 'Pike Push-Ups', bodyPart: 'Shoulders' },
  { name: 'Shrugs', bodyPart: 'Shoulders' },

  // Arms
  { name: 'Bicep Curl', bodyPart: 'Arms' },
  { name: 'Hammer Curl', bodyPart: 'Arms' },
  { name: 'Tricep Dip', bodyPart: 'Arms' },
  { name: 'Tricep Pushdown', bodyPart: 'Arms' },
  { name: 'Skull Crusher', bodyPart: 'Arms' },
  { name: 'Concentration Curl', bodyPart: 'Arms' },
  { name: 'Preacher Curl', bodyPart: 'Arms' },
  { name: 'Overhead Tricep Extension', bodyPart: 'Arms' },
  { name: 'Close-Grip Push-Ups', bodyPart: 'Arms' },

  // Core
  { name: 'Plank', bodyPart: 'Core' },
  { name: 'Crunches', bodyPart: 'Core' },
  { name: 'Leg Raises', bodyPart: 'Core' },
  { name: 'Russian Twist', bodyPart: 'Core' },
  { name: 'Bicycle Crunch', bodyPart: 'Core' },
  { name: 'Hanging Knee Raise', bodyPart: 'Core' },
  { name: 'Ab Wheel Rollout', bodyPart: 'Core' },
  { name: 'Mountain Climbers', bodyPart: 'Core' },
  { name: 'Side Plank', bodyPart: 'Core' },

  // Cardio
  { name: 'Running', bodyPart: 'Cardio' },
  { name: 'Jump Rope', bodyPart: 'Cardio' },
  { name: 'Burpees', bodyPart: 'Cardio' },
  { name: 'Jumping Jacks', bodyPart: 'Cardio' },
  { name: 'Box Jumps', bodyPart: 'Cardio' },
  { name: 'Rowing Machine', bodyPart: 'Cardio' },
  { name: 'Assault Bike', bodyPart: 'Cardio' },

  // Full Body
  { name: 'Clean and Press', bodyPart: 'Full Body' },
  { name: 'Thruster', bodyPart: 'Full Body' },
  { name: 'Turkish Get-Up', bodyPart: 'Full Body' },
  { name: 'Kettlebell Swing', bodyPart: 'Full Body' },
  { name: 'Farmer Walk', bodyPart: 'Full Body' },
  { name: 'Battle Ropes', bodyPart: 'Full Body' },
];

export function getBodyPart(exerciseName) {
  const ex = EXERCISE_DEFAULTS.find(e =>
    e.name.toLowerCase() === exerciseName.toLowerCase()
  );
  return ex?.bodyPart || 'Other';
}
