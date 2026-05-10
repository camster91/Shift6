// Shift6 Exercise Database — Your personal exercise collection
// Each exercise has: id, name, bodyPart, color, equipment, gym/home flags, and progression levels

const EXERCISE_COLORS = [
  'blue', 'cyan', 'emerald', 'orange', 'purple',
  'pink', 'teal', 'yellow', 'indigo', 'rose'
];

const colorFor = (i) => EXERCISE_COLORS[i % EXERCISE_COLORS.length];

export const EXERCISES = [
  // ── CHEST ──
  { id: 'pushups', name: 'Push-Ups', bodyPart: 'Chest', equipment: 'none', home: true, gym: true, startReps: 10, youtubeId: 'IODxDxX7oi4', instructions: 'Keep body straight, lower chest to ground', color: colorFor(0) },
  { id: 'wide_pushups', name: 'Wide Push-Ups', bodyPart: 'Chest', equipment: 'none', home: true, gym: true, startReps: 8, youtubeId: 'IODxDxX7oi4', instructions: 'Hands wider than shoulder width', color: colorFor(1) },
  { id: 'decline_pushups', name: 'Decline Push-Ups', bodyPart: 'Chest', equipment: 'bench', home: false, gym: true, startReps: 8, youtubeId: 'N0C6wA3Q', instructions: 'Feet elevated on bench, hands on floor', color: colorFor(2) },
  { id: 'diamond_pushups', name: 'Diamond Push-Ups', bodyPart: 'Chest', equipment: 'none', home: true, gym: true, startReps: 6, youtubeId: 'IODxDxX7oi4', instructions: 'Hands form diamond shape under chest', color: colorFor(3) },
  { id: 'bench_press', name: 'Bench Press', bodyPart: 'Chest', equipment: 'barbell', home: false, gym: true, startReps: 8, youtubeId: 'rT7DgCr-3', instructions: 'Barbell or dumbbell press from bench', color: colorFor(4) },
  { id: 'dumbbell_fly', name: 'Dumbbell Fly', bodyPart: 'Chest', equipment: 'dumbbells', home: false, gym: true, startReps: 10, youtubeId: 'eozV4Ziy', instructions: 'Arms wide, squeeze chest at top', color: colorFor(5) },
  { id: 'incline_bench', name: 'Incline Bench Press', bodyPart: 'Chest', equipment: 'barbell', home: false, gym: true, startReps: 8, youtubeId: 'Srq1TH0', instructions: 'Bench at 30-45 degree angle', color: colorFor(6) },
  { id: 'cable_crossover', name: 'Cable Crossover', bodyPart: 'Chest', equipment: 'cable', home: false, gym: true, startReps: 12, youtubeId: 'taI4XG', instructions: 'Pull cables together in front of chest', color: colorFor(7) },
  { id: 'chest_dips', name: 'Chest Dips', bodyPart: 'Chest', equipment: 'dip_bars', home: false, gym: true, startReps: 8, youtubeId: '2z8gYd', instructions: 'Lean forward, lower until shoulders below elbows', color: colorFor(8) },

  // ── BACK ──
  { id: 'pullups', name: 'Pull-Ups', bodyPart: 'Back', equipment: 'pullup_bar', home: true, gym: true, startReps: 5, youtubeId: 'eGo4IY', instructions: 'Chin over bar, engage lats', color: colorFor(0) },
  { id: 'chinups', name: 'Chin-Ups', bodyPart: 'Back', equipment: 'pullup_bar', home: true, gym: true, startReps: 6, youtubeId: 'brhRXl', instructions: 'Palms facing you, chin over bar', color: colorFor(1) },
  { id: 'rows', name: 'Bent Over Rows', bodyPart: 'Back', equipment: 'barbell', home: false, gym: true, startReps: 8, youtubeId: 'roCP6w', instructions: 'Hinge at hips, pull bar to lower ribcage', color: colorFor(2) },
  { id: 'dumbbell_row', name: 'Dumbbell Row', bodyPart: 'Back', equipment: 'dumbbells', home: false, gym: true, startReps: 10, youtubeId: 'roCP6w', instructions: 'One arm supported, pull dumbbell to hip', color: colorFor(3) },
  { id: 'lat_pulldown', name: 'Lat Pulldown', bodyPart: 'Back', equipment: 'cable', home: false, gym: true, startReps: 10, youtubeId: 'lueE4G', instructions: 'Pull bar down to upper chest', color: colorFor(4) },
  { id: 'cable_row', name: 'Seated Cable Row', bodyPart: 'Back', equipment: 'cable', home: false, gym: true, startReps: 10, youtubeId: 'GZ0IeM', instructions: 'Pull handle to torso, squeeze shoulder blades', color: colorFor(5) },
  { id: 'inverted_rows', name: 'Inverted Rows', bodyPart: 'Back', equipment: 'bar', home: true, gym: true, startReps: 8, youtubeId: 'dMy8Fw', instructions: 'Pull chest to bar from underneath', color: colorFor(6) },
  { id: 'deadlift', name: 'Deadlift', bodyPart: 'Back', equipment: 'barbell', home: false, gym: true, startReps: 5, youtubeId: 'r4MzXt', instructions: 'Hip hinge, pull bar from floor, stand tall', color: colorFor(7) },
  { id: 'supermans', name: 'Supermans', bodyPart: 'Back', equipment: 'none', home: true, gym: true, startReps: 12, youtubeId: 'cc6LSm', instructions: 'Lift arms and legs off floor simultaneously', color: colorFor(8) },

  // ── SHOULDERS ──
  { id: 'shoulder_press', name: 'Overhead Press', bodyPart: 'Shoulders', equipment: 'barbell', home: false, gym: true, startReps: 8, youtubeId: '2yjwXT', instructions: 'Press bar from shoulders to overhead', color: colorFor(0) },
  { id: 'dumbbell_press', name: 'Dumbbell Shoulder Press', bodyPart: 'Shoulders', equipment: 'dumbbells', home: false, gym: true, startReps: 10, youtubeId: 'qEwKCR', instructions: 'Press dumbbells from shoulders overhead', color: colorFor(1) },
  { id: 'lateral_raise', name: 'Lateral Raises', bodyPart: 'Shoulders', equipment: 'dumbbells', home: false, gym: true, startReps: 12, youtubeId: '3VcKaX', instructions: 'Raise arms to sides to shoulder height', color: colorFor(2) },
  { id: 'front_raise', name: 'Front Raises', bodyPart: 'Shoulders', equipment: 'dumbbells', home: false, gym: true, startReps: 12, youtubeId: 'tBkG5C', instructions: 'Raise arms in front to shoulder height', color: colorFor(3) },
  { id: 'face_pull', name: 'Face Pulls', bodyPart: 'Shoulders', equipment: 'cable', home: false, gym: true, startReps: 15, youtubeId: 'rep-qV', instructions: 'Pull rope towards face, elbows high', color: colorFor(4) },
  { id: 'pike_pushups', name: 'Pike Push-Ups', bodyPart: 'Shoulders', equipment: 'none', home: true, gym: true, startReps: 8, youtubeId: 'p6Rjn1', instructions: 'Hips up, lower head toward floor', color: colorFor(5) },
  { id: 'arnold_press', name: 'Arnold Press', bodyPart: 'Shoulders', equipment: 'dumbbells', home: false, gym: true, startReps: 10, youtubeId: '6Z15S', instructions: 'Rotate palms forward as you press overhead', color: colorFor(6) },
  { id: 'upright_row', name: 'Upright Rows', bodyPart: 'Shoulders', equipment: 'barbell', home: false, gym: true, startReps: 10, youtubeId: 'am0F6s', instructions: 'Pull bar up to chin, elbows above hands', caution: 'Use light weight, avoid shoulder impingement', color: colorFor(7) },
  { id: 'handstand_hold', name: 'Handstand Hold', bodyPart: 'Shoulders', equipment: 'wall', home: true, gym: true, startReps: 15, youtubeId: 'gX7VQt', instructions: 'Kick up against wall, hold straight body', color: colorFor(8) },

  // ── LEGS ──
  { id: 'squats', name: 'Bodyweight Squats', bodyPart: 'Legs', equipment: 'none', home: true, gym: true, startReps: 15, youtubeId: 'YaXPRqU', instructions: 'Toes forward, hips down to parallel', color: colorFor(0) },
  { id: 'goblet_squat', name: 'Goblet Squats', bodyPart: 'Legs', equipment: 'dumbbells', home: false, gym: true, startReps: 12, youtubeId: 'MeIiMd', instructions: 'Hold dumbbell at chest, squat deep', color: colorFor(1) },
  { id: 'barbell_squat', name: 'Barbell Squats', bodyPart: 'Legs', equipment: 'barbell', home: false, gym: true, startReps: 8, youtubeId: 'ultWZb', instructions: 'Bar on traps, squat to parallel or below', color: colorFor(2) },
  { id: 'lunges', name: 'Lunges', bodyPart: 'Legs', equipment: 'none', home: true, gym: true, startReps: 10, youtubeId: 'QovUsy', instructions: 'Step forward, both knees at 90 degrees', color: colorFor(3) },
  { id: 'reverse_lunges', name: 'Reverse Lunges', bodyPart: 'Legs', equipment: 'none', home: true, gym: true, startReps: 10, youtubeId: 'L8fvyp', instructions: 'Step back instead of forward', color: colorFor(4) },
  { id: 'bulgarian_split', name: 'Bulgarian Split Squats', bodyPart: 'Legs', equipment: 'bench', home: false, gym: true, startReps: 10, youtubeId: '2C-uNg', instructions: 'Back foot on bench, front foot forward, squat', color: colorFor(5) },
  { id: 'leg_press', name: 'Leg Press', bodyPart: 'Legs', equipment: 'machine', home: false, gym: true, startReps: 12, youtubeId: 'G0kG7H', instructions: 'Push platform away using legs', color: colorFor(6) },
  { id: 'romanian_deadlift', name: 'Romanian Deadlift', bodyPart: 'Legs', equipment: 'barbell', home: false, gym: true, startReps: 10, youtubeId: '2C-uNg', instructions: 'Hinge at hips, feel hamstring stretch', color: colorFor(7) },
  { id: 'leg_curls', name: 'Leg Curls', bodyPart: 'Legs', equipment: 'machine', home: false, gym: true, startReps: 12, youtubeId: '1Tq3Qd', instructions: 'Curl weight toward glutes', color: colorFor(8) },
  { id: 'leg_extension', name: 'Leg Extension', bodyPart: 'Legs', equipment: 'machine', home: false, gym: true, startReps: 12, youtubeId: 'ljO0vj', instructions: 'Extend legs from seated position', color: colorFor(0) },
  { id: 'glute_bridge', name: 'Glute Bridges', bodyPart: 'Legs', equipment: 'none', home: true, gym: true, startReps: 15, youtubeId: 'wPM8mg', instructions: 'Lift hips up, squeeze glutes at top', color: colorFor(1) },
  { id: 'step_ups', name: 'Step-Ups', bodyPart: 'Legs', equipment: 'bench', home: true, gym: true, startReps: 10, youtubeId: 'WCFTan', instructions: 'Step onto bench, drive through heel', color: colorFor(2) },
  { id: 'weighted_step_ups', name: 'Weighted Step-Ups', bodyPart: 'Legs', equipment: 'dumbbells', home: false, gym: true, startReps: 8, youtubeId: 'WCFTan', instructions: 'Hold dumbbells, step up onto bench', color: colorFor(3) },
  { id: 'hip_thrusts', name: 'Hip Thrusts', bodyPart: 'Legs', equipment: 'barbell', home: false, gym: true, startReps: 10, youtubeId: '2S1Mik', instructions: 'Back on bench, drive hips up with bar', color: colorFor(4) },
  { id: 'wall_sit', name: 'Wall Sits', bodyPart: 'Legs', equipment: 'wall', home: true, gym: true, startReps: 30, unit: 'seconds', youtubeId: 'y-wVn3', instructions: 'Back against wall, thighs parallel to floor', color: colorFor(5) },
  { id: 'calf_raises', name: 'Calf Raises', bodyPart: 'Legs', equipment: 'none', home: true, gym: true, startReps: 20, youtubeId: 'GZjP1l', instructions: 'Rise onto toes, lower slowly', color: colorFor(6) },

  // ── ARMS ──
  { id: 'bicep_curl', name: 'Bicep Curls', bodyPart: 'Arms', equipment: 'dumbbells', home: false, gym: true, startReps: 12, youtubeId: 'ykJmrZ', instructions: 'Curl dumbbells toward shoulders', color: colorFor(0) },
  { id: 'hammer_curl', name: 'Hammer Curls', bodyPart: 'Arms', equipment: 'dumbbells', home: false, gym: true, startReps: 12, youtubeId: 'zC3nJg', instructions: 'Palms facing each other, curl up', color: colorFor(1) },
  { id: 'tricep_dips', name: 'Tricep Dips', bodyPart: 'Arms', equipment: 'bench', home: true, gym: true, startReps: 10, youtubeId: 'tKj2bu', instructions: 'Hands on bench, lower body, keep back close', color: colorFor(2) },
  { id: 'tricep_pushdown', name: 'Tricep Pushdown', bodyPart: 'Arms', equipment: 'cable', home: false, gym: true, startReps: 12, youtubeId: '2-LAMc', instructions: 'Push cable down, lock elbows at sides', color: colorFor(3) },
  { id: 'overhead_tricep', name: 'Overhead Tricep Extension', bodyPart: 'Arms', equipment: 'dumbbells', home: false, gym: true, startReps: 10, youtubeId: 'nRi7gZ', instructions: 'Dumbbell behind head, extend upward', color: colorFor(4) },
  { id: 'skull_crushers', name: 'Skull Crushers', bodyPart: 'Arms', equipment: 'barbell', home: false, gym: true, startReps: 10, youtubeId: 'd_KZUk', instructions: 'Lower bar toward forehead, extend', color: colorFor(5) },
  { id: 'preacher_curl', name: 'Preacher Curls', bodyPart: 'Arms', equipment: 'barbell', home: false, gym: true, startReps: 10, youtubeId: 'fIeFvS', instructions: 'Arms on pad, curl bar up', color: colorFor(6) },
  { id: 'concentration_curl', name: 'Concentration Curls', bodyPart: 'Arms', equipment: 'dumbbells', home: true, gym: true, startReps: 12, youtubeId: '0CA3nM', instructions: 'Seated, elbow on inner thigh, curl up', color: colorFor(7) },

  // ── CORE ──
  { id: 'plank', name: 'Plank', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 30, unit: 'seconds', youtubeId: 'pSHjTR', instructions: 'Forearms on floor, body straight, hold', color: colorFor(0) },
  { id: 'side_plank', name: 'Side Plank', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 20, unit: 'seconds', youtubeId: 'k2vVwR', instructions: 'On one forearm, body in straight line', color: colorFor(1) },
  { id: 'crunches', name: 'Crunches', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 20, youtubeId: 'Xyd_fa', instructions: 'Curl shoulders off floor, lower back stays', color: colorFor(2) },
  { id: 'leg_raises', name: 'Leg Raises', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 12, youtubeId: 'JB2oy', instructions: 'Lie flat, raise legs to 90 degrees', color: colorFor(3) },
  { id: 'russian_twists', name: 'Russian Twists', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 16, youtubeId: 'wkD8rq', instructions: 'Sit leaned back, rotate torso side to side', color: colorFor(4) },
  { id: 'hanging_leg_raise', name: 'Hanging Leg Raises', bodyPart: 'Core', equipment: 'pullup_bar', home: false, gym: true, startReps: 10, youtubeId: 'JB2oy', instructions: 'Hang from bar, raise legs to parallel', color: colorFor(5) },
  { id: 'cable_crunch', name: 'Cable Crunch', bodyPart: 'Core', equipment: 'cable', home: false, gym: true, startReps: 12, youtubeId: '6c6QMK', instructions: 'Pull cable down with torso, crunch forward', color: colorFor(6) },
  { id: 'dead_bugs', name: 'Dead Bugs', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 10, youtubeId: '2ByXfn', instructions: 'Arm and leg extend opposite sides simultaneously', color: colorFor(7) },
  { id: 'bicycle_crunches', name: 'Bicycle Crunches', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 16, youtubeId: 'Iwyvoz', instructions: 'Alternate elbow to opposite knee', color: colorFor(8) },
  { id: 'mountain_climbers', name: 'Mountain Climbers', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 20, youtubeId: 'nmwgir', instructions: 'Plank position, drive knees to chest alternately', color: colorFor(0) },
  { id: 'v_ups', name: 'V-Ups', bodyPart: 'Core', equipment: 'none', home: true, gym: true, startReps: 12, youtubeId: 'iP2fjL', instructions: 'Raise legs and torso simultaneously', color: colorFor(1) },
  { id: 'ab_wheel', name: 'Ab Wheel Rollout', bodyPart: 'Core', equipment: 'ab_wheel', home: true, gym: true, startReps: 8, youtubeId: 'X8cNgs', instructions: 'Roll wheel forward, extend body, pull back', color: colorFor(2) },

  // ── GLUTES & HIPS ──
  { id: 'clamshells', name: 'Clamshells', bodyPart: 'Glutes', equipment: 'none', home: true, gym: true, startReps: 15, youtubeId: '6rT8', instructions: 'Side lying, open top knee like a clamshell', color: colorFor(0) },
  { id: 'fire_hydrants', name: 'Fire Hydrants', bodyPart: 'Glutes', equipment: 'none', home: true, gym: true, startReps: 12, youtubeId: '5pPv', instructions: 'On all fours, lift knee out to side', color: colorFor(1) },
  { id: 'donkey_kicks', name: 'Donkey Kicks', bodyPart: 'Glutes', equipment: 'none', home: true, gym: true, startReps: 12, youtubeId: '6X0h', instructions: 'On all fours, kick foot toward ceiling', color: colorFor(2) },
];

export const BODY_PARTS = [...new Set(EXERCISES.map(e => e.bodyPart))];

export const EQUIPMENT_TYPES = [
  { id: 'none', label: 'No Equipment', icon: '🏠' },
  { id: 'dumbbells', label: 'Dumbbells', icon: '🏋️' },
  { id: 'barbell', label: 'Barbell', icon: '🏋️' },
  { id: 'pullup_bar', label: 'Pull-Up Bar', icon: '⬛' },
  { id: 'dip_bars', label: 'Dip Bars', icon: '⬛' },
  { id: 'bench', label: 'Bench', icon: '🪑' },
  { id: 'cable', label: 'Cable Machine', icon: '⬛' },
  { id: 'machine', label: 'Gym Machine', icon: '⬛' },
  { id: 'wall', label: 'Wall', icon: '🧱' },
  { id: 'bar', label: 'Bar', icon: '⬛' },
  { id: 'ab_wheel', label: 'Ab Wheel', icon: '⚙️' },
];

export const COLOR_MAP = {
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', solid: 'bg-blue-500', hex: '#3b82f6' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/30', text: 'text-cyan-400', solid: 'bg-cyan-500', hex: '#06b6d4' },
  emerald: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', solid: 'bg-emerald-500', hex: '#10b981' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400', solid: 'bg-orange-500', hex: '#f97316' },
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400', solid: 'bg-purple-500', hex: '#a855f7' },
  pink: { bg: 'bg-pink-500/10', border: 'border-pink-500/30', text: 'text-pink-400', solid: 'bg-pink-500', hex: '#ec4899' },
  teal: { bg: 'bg-teal-500/10', border: 'border-teal-500/30', text: 'text-teal-400', solid: 'bg-teal-500', hex: '#14b8a6' },
  yellow: { bg: 'bg-yellow-500/10', border: 'border-yellow-500/30', text: 'text-yellow-400', solid: 'bg-yellow-500', hex: '#eab308' },
  indigo: { bg: 'bg-indigo-500/10', border: 'border-indigo-500/30', text: 'text-indigo-400', solid: 'bg-indigo-500', hex: '#6366f1' },
  rose: { bg: 'bg-rose-500/10', border: 'border-rose-500/30', text: 'text-rose-400', solid: 'bg-rose-500', hex: '#f43f5e' },
};

export function getBodyPart(exerciseName) {
  const ex = EXERCISES.find(e => e.name === exerciseName);
  return ex?.bodyPart || 'Other';
}

export function getExercise(id) {
  return EXERCISES.find(e => e.id === id);
}
