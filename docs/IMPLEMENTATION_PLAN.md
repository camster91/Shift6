# Shift6 Persona System - Implementation Plan

## Executive Summary

This plan implements persona-aware features across 6 phases, addressing the needs of all 6 user personas identified in USER_PERSONAS.md. Total estimated scope: ~40 tasks across 6 phases.

---

## Phase 1: Persona Detection & Onboarding (P0)

**Goal:** Detect user persona early in onboarding and tailor the experience

### Task 1.1: Add Persona Type System

**File:** `src/utils/personas.js` (NEW)

```javascript
// Persona definitions
export const PERSONA_TYPES = {
  HOME_HERO: 'home_hero',
  GYM_WARRIOR: 'gym_warrior',
  HYBRID_FLEX: 'hybrid_flex',
  BUSY_BEE: 'busy_bee',
  GOLDEN_YEARS: 'golden_years',
  COMPETITOR: 'competitor'
}

// Detection logic based on onboarding answers
export const detectPersona = (preferences) => {
  const {
    programMode,
    targetSessionDuration,
    fitnessLevel,
    trainingDaysPerWeek,
    repScheme,
    userAge // new field
  } = preferences

  // Priority order matters - check most specific first
  if (userAge >= 55 || fitnessLevel === 'beginner' && targetSessionDuration <= 20) {
    return PERSONA_TYPES.GOLDEN_YEARS
  }
  if (targetSessionDuration <= 15) {
    return PERSONA_TYPES.BUSY_BEE
  }
  if (repScheme === 'strength' && trainingDaysPerWeek >= 5) {
    return PERSONA_TYPES.COMPETITOR
  }
  if (programMode === 'gym') {
    return PERSONA_TYPES.GYM_WARRIOR
  }
  if (programMode === 'mixed') {
    return PERSONA_TYPES.HYBRID_FLEX
  }
  return PERSONA_TYPES.HOME_HERO
}

// Persona-specific defaults
export const PERSONA_DEFAULTS = {
  home_hero: {
    programMode: 'bodyweight',
    targetSessionDuration: 25,
    repScheme: 'balanced',
    setsPerExercise: 4
  },
  gym_warrior: {
    programMode: 'gym',
    targetSessionDuration: 45,
    repScheme: 'hypertrophy',
    setsPerExercise: 5
  },
  // ... etc
}
```

### Task 1.2: Add Persona Selection Step to Onboarding

**File:** `src/components/Views/Onboarding.jsx`

**Changes:**
1. Add new Step 0: "What best describes you?"
2. Show 6 persona cards with icons and descriptions
3. Auto-populate preferences based on selection
4. Allow "Customize" option to go through detailed steps

```javascript
// New persona selection UI (insert before current step 1)
const PERSONA_OPTIONS = [
  {
    id: 'home_hero',
    icon: '🏠',
    title: 'Home Workout Hero',
    desc: 'I prefer working out at home with minimal equipment'
  },
  {
    id: 'gym_warrior',
    icon: '🏋️',
    title: 'Gym Regular',
    desc: 'I go to the gym and have access to full equipment'
  },
  {
    id: 'hybrid_flex',
    icon: '🔄',
    title: 'Flexible Trainer',
    desc: 'I mix home workouts with gym sessions'
  },
  {
    id: 'busy_bee',
    icon: '⚡',
    title: 'Time-Crunched',
    desc: 'I only have 10-15 minutes for quick workouts'
  },
  {
    id: 'golden_years',
    icon: '🌟',
    title: 'Active Ager',
    desc: 'I\'m focused on mobility, balance, and safe progression'
  },
  {
    id: 'competitor',
    icon: '🏆',
    title: 'Athlete',
    desc: 'I\'m training for sports or competition'
  }
]
```

### Task 1.3: Store Persona in Preferences

**File:** `src/utils/constants.js`

```javascript
// Add to STORAGE_KEYS
userPersona: 'shift6_user_persona'
```

**File:** `src/utils/preferences.js`

```javascript
// Add persona to DEFAULT_TRAINING_PREFERENCES
persona: null, // Will be set during onboarding

// Add to validatePreferences()
if (prefs.persona && !Object.values(PERSONA_TYPES).includes(prefs.persona)) {
  prefs.persona = null
}
```

### Task 1.4: Persona-Based Onboarding Flow

**File:** `src/components/Views/Onboarding.jsx`

**Logic:**
- If persona selected → skip to relevant steps only
- Busy Bee: Skip to schedule → express program
- Golden Years: Add accessibility step → safe exercises
- Competitor: Add competition date → periodization

```javascript
const getStepsForPersona = (persona) => {
  switch (persona) {
    case 'busy_bee':
      return ['persona', 'schedule_quick', 'program_express', 'confirm']
    case 'golden_years':
      return ['persona', 'accessibility', 'equipment_home', 'program_safe', 'confirm']
    case 'competitor':
      return ['persona', 'sport', 'competition_date', 'equipment_full', 'program_periodized', 'confirm']
    case 'gym_warrior':
      return ['persona', 'equipment_gym', 'goals', 'schedule', 'program', 'confirm']
    case 'hybrid_flex':
      return ['persona', 'locations', 'equipment_both', 'schedule', 'program', 'confirm']
    default: // home_hero
      return ['persona', 'equipment_home', 'goals', 'schedule', 'program', 'confirm']
  }
}
```

---

## Phase 2: Express Workout Mode (P0)

**Goal:** Enable 8-10 minute workouts for time-constrained users

### Task 2.1: Add Express Mode Configuration

**File:** `src/utils/constants.js`

```javascript
export const EXPRESS_MODE = {
  enabled: false,
  sets: 2,
  restBetweenSets: 20, // seconds
  targetDuration: 8, // minutes
  maxExercises: 2,
  skipReadiness: true,
  autoStartTimer: true
}
```

### Task 2.2: Express Mode Toggle in Settings

**File:** `src/components/Views/TrainingSettings.jsx`

```javascript
// Add Express Mode section
<div className="setting-group">
  <h3>Express Mode</h3>
  <p>Quick 8-minute workouts with 2 sets per exercise</p>
  <Toggle
    checked={trainingPreferences.expressMode}
    onChange={(v) => updatePreference('expressMode', v)}
  />
</div>
```

### Task 2.3: Express Workout Session Flow

**File:** `src/components/Views/WorkoutSession.jsx`

**Changes:**
1. Detect `currentSession.expressMode`
2. Skip readiness check if express
3. Show simplified UI (hide advanced options)
4. Auto-advance with shorter rest
5. Show "Express" badge in header

```javascript
// In WorkoutSession component
const isExpress = currentSession?.expressMode || false

// Skip readiness for express
useEffect(() => {
  if (isExpress && step === 'readiness') {
    handleReadiness('normal') // Auto-select normal
  }
}, [isExpress, step])

// Simplified UI for express
{isExpress ? (
  <ExpressWorkoutUI {...props} />
) : (
  <FullWorkoutUI {...props} />
)}
```

### Task 2.4: Express Dashboard Widget

**File:** `src/components/Views/Dashboard.jsx`

```javascript
// Add quick-start express section
{persona === 'busy_bee' && (
  <div className="express-start-card">
    <span className="badge">⚡ 8 min</span>
    <h3>Quick Workout</h3>
    <p>2 exercises, 2 sets each</p>
    <button onClick={startExpressWorkout}>
      Start Express
    </button>
  </div>
)}
```

### Task 2.5: Express Program Generation

**File:** `src/utils/smartProgramGenerator.js`

```javascript
// Add express program template
export const generateExpressProgram = (preferences) => {
  const exercises = selectExpressExercises(preferences)
  return {
    type: 'express',
    exercises: exercises.slice(0, 2),
    sets: 2,
    duration: 8,
    rest: 20
  }
}

// Select complementary exercises (upper + lower or push + pull)
const selectExpressExercises = (prefs) => {
  const pairs = [
    ['pushups', 'squats'],
    ['pullups', 'lunges'],
    ['dips', 'glutebridge'],
    ['plank', 'supermans']
  ]
  // Rotate based on day of week
  const dayIndex = new Date().getDay() % pairs.length
  return pairs[dayIndex]
}
```

---

## Phase 3: Equipment-Smart Filtering (P0)

**Goal:** Auto-substitute exercises based on available equipment

### Task 3.1: Equipment Requirements Data

**File:** `src/data/exercises.jsx`

```javascript
// Add equipment requirements to each exercise
export const EXERCISE_EQUIPMENT = {
  pushups: { required: [], optional: ['parallettes'] },
  pullups: { required: ['pullup_bar'], optional: ['resistance_band'] },
  dips: { required: ['dip_bars'], alternatives: ['chair'] },
  squats: { required: [], optional: ['weight_vest'] },
  // ... etc
}

// Equipment alternatives mapping
export const EQUIPMENT_ALTERNATIVES = {
  pullup_bar: {
    substitute: 'inverted_rows',
    description: 'Use a sturdy table for inverted rows'
  },
  dip_bars: {
    substitute: 'chair_dips',
    description: 'Use two sturdy chairs'
  }
}
```

### Task 3.2: Equipment Check in Onboarding

**File:** `src/components/Views/Onboarding.jsx`

```javascript
// Enhanced equipment step for home users
const HOME_EQUIPMENT_OPTIONS = [
  { id: 'none', label: 'No equipment', icon: '🏠' },
  { id: 'pullup_bar', label: 'Pull-up bar', icon: '🔲' },
  { id: 'dip_station', label: 'Dip bars/station', icon: '⬛' },
  { id: 'resistance_bands', label: 'Resistance bands', icon: '🎗️' },
  { id: 'chair', label: 'Sturdy chair', icon: '🪑' },
  { id: 'table', label: 'Sturdy table', icon: '🪵' }
]

// Show equipment-dependent exercise availability
const getAvailableExercises = (equipment) => {
  return Object.entries(EXERCISE_EQUIPMENT).filter(([key, req]) => {
    if (req.required.length === 0) return true
    return req.required.every(eq =>
      equipment.includes(eq) || equipment.includes(EQUIPMENT_ALTERNATIVES[eq]?.substitute)
    )
  })
}
```

### Task 3.3: Exercise Substitution Logic

**File:** `src/utils/exerciseSubstitution.js` (NEW)

```javascript
export const getSubstituteExercise = (exerciseKey, userEquipment) => {
  const requirements = EXERCISE_EQUIPMENT[exerciseKey]

  // Check if user has required equipment
  const hasRequired = requirements.required.every(eq =>
    userEquipment.includes(eq)
  )

  if (hasRequired) return exerciseKey // No substitution needed

  // Find substitute
  for (const req of requirements.required) {
    if (!userEquipment.includes(req)) {
      const alt = EQUIPMENT_ALTERNATIVES[req]
      if (alt) return alt.substitute
    }
  }

  return null // No suitable substitute
}

export const filterProgramByEquipment = (program, userEquipment) => {
  return program.map(exerciseKey => {
    const substitute = getSubstituteExercise(exerciseKey, userEquipment)
    return substitute || exerciseKey
  }).filter(Boolean)
}
```

### Task 3.4: Equipment Warning UI

**File:** `src/components/Views/Dashboard.jsx`

```javascript
// Show warning if exercise needs equipment user doesn't have
const EquipmentWarning = ({ exercise, userEquipment }) => {
  const missing = getMissingEquipment(exercise, userEquipment)
  if (!missing.length) return null

  return (
    <div className="equipment-warning">
      <span>⚠️ Needs: {missing.join(', ')}</span>
      <button onClick={() => showAlternative(exercise)}>
        See alternative
      </button>
    </div>
  )
}
```

---

## Phase 4: Location-Aware Workouts (P1)

**Goal:** Filter exercises by current workout location

### Task 4.1: Location Data Model

**File:** `src/utils/constants.js`

```javascript
export const WORKOUT_LOCATIONS = {
  HOME: 'home',
  GYM: 'gym',
  OUTDOOR: 'outdoor',
  TRAVEL: 'travel'
}
```

**File:** `src/data/exercises.jsx`

```javascript
// Add location compatibility to exercises
export const EXERCISE_LOCATIONS = {
  pushups: ['home', 'gym', 'outdoor', 'travel'],
  pullups: ['home', 'gym'], // needs bar
  squats: ['home', 'gym', 'outdoor', 'travel'],
  bench_press: ['gym'],
  // ... etc
}
```

### Task 4.2: Location Selector Component

**File:** `src/components/UI/LocationSelector.jsx` (NEW)

```javascript
const LocationSelector = ({ currentLocation, onSelect }) => {
  const locations = [
    { id: 'home', icon: '🏠', label: 'Home' },
    { id: 'gym', icon: '🏋️', label: 'Gym' },
    { id: 'outdoor', icon: '🌳', label: 'Outdoor' },
    { id: 'travel', icon: '✈️', label: 'Travel' }
  ]

  return (
    <div className="location-selector">
      <p>Where are you working out?</p>
      <div className="location-options">
        {locations.map(loc => (
          <button
            key={loc.id}
            className={currentLocation === loc.id ? 'selected' : ''}
            onClick={() => onSelect(loc.id)}
          >
            <span>{loc.icon}</span>
            <span>{loc.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
```

### Task 4.3: Location-Filtered Dashboard

**File:** `src/components/Views/Dashboard.jsx`

```javascript
// Add location state
const [currentLocation, setCurrentLocation] = useState(() => {
  return localStorage.getItem('shift6_current_location') || 'home'
})

// Filter exercises by location
const filteredExercises = useMemo(() => {
  return Object.entries(programExercises).filter(([key]) => {
    const locations = EXERCISE_LOCATIONS[key] || ['home', 'gym']
    return locations.includes(currentLocation)
  })
}, [programExercises, currentLocation])
```

### Task 4.4: Location in Workout History

**File:** `src/App.jsx`

```javascript
// Add location to history entries
const historyEntry = {
  ...existingFields,
  location: currentLocation // 'home' | 'gym' | 'outdoor' | 'travel'
}
```

---

## Phase 5: Accessibility Settings (P1)

**Goal:** Make app usable for seniors and users with accessibility needs

### Task 5.1: Accessibility Preferences

**File:** `src/utils/constants.js`

```javascript
export const ACCESSIBILITY_DEFAULTS = {
  fontSize: 'normal', // 'normal' | 'large' | 'extra-large'
  highContrast: false,
  reducedMotion: false,
  simpleLanguage: false,
  longerRestTimes: false,
  largerButtons: false,
  voiceInstructions: false
}
```

### Task 5.2: Accessibility Settings UI

**File:** `src/components/Views/AccessibilitySettings.jsx` (NEW)

```javascript
const AccessibilitySettings = ({ settings, onUpdate }) => {
  return (
    <div className="accessibility-settings">
      <h2>Accessibility</h2>

      <SettingRow
        label="Text Size"
        options={['Normal', 'Large', 'Extra Large']}
        value={settings.fontSize}
        onChange={(v) => onUpdate('fontSize', v)}
      />

      <SettingToggle
        label="High Contrast"
        description="Increase color contrast for better visibility"
        value={settings.highContrast}
        onChange={(v) => onUpdate('highContrast', v)}
      />

      <SettingToggle
        label="Reduce Motion"
        description="Minimize animations and transitions"
        value={settings.reducedMotion}
        onChange={(v) => onUpdate('reducedMotion', v)}
      />

      <SettingToggle
        label="Simple Language"
        description="Replace fitness jargon with plain terms"
        value={settings.simpleLanguage}
        onChange={(v) => onUpdate('simpleLanguage', v)}
      />

      <SettingToggle
        label="Longer Rest Times"
        description="Double the default rest between sets"
        value={settings.longerRestTimes}
        onChange={(v) => onUpdate('longerRestTimes', v)}
      />

      <SettingToggle
        label="Larger Touch Targets"
        description="Make buttons bigger and easier to tap"
        value={settings.largerButtons}
        onChange={(v) => onUpdate('largerButtons', v)}
      />
    </div>
  )
}
```

### Task 5.3: Apply Accessibility Styles

**File:** `src/index.css`

```css
/* Font size scaling */
html.font-large {
  font-size: 18px;
}
html.font-extra-large {
  font-size: 22px;
}

/* High contrast mode */
html.high-contrast {
  --bg-primary: #000000;
  --text-primary: #ffffff;
  --accent: #00ff00;
  --border: #ffffff;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce), html.reduced-motion {
  * {
    animation: none !important;
    transition: none !important;
  }
}

/* Larger buttons */
html.large-buttons button,
html.large-buttons .btn {
  min-height: 56px;
  min-width: 56px;
  padding: 16px 24px;
  font-size: 1.1em;
}
```

### Task 5.4: Plain Language Dictionary

**File:** `src/utils/language.js` (NEW)

```javascript
export const PLAIN_LANGUAGE = {
  'AMRAP': 'As Many As You Can',
  'RPE': 'Effort Level (1-10)',
  'Superset': 'Back-to-Back Exercises',
  'Hypertrophy': 'Muscle Building',
  'Progressive Overload': 'Gradually Doing More',
  'Deload': 'Easy Recovery Week',
  'PR': 'Personal Best',
  'Rep': 'Repetition',
  'Set': 'Group of Reps',
  'Rest': 'Break Between Sets'
}

export const simplifyText = (text, enabled) => {
  if (!enabled) return text
  let simplified = text
  Object.entries(PLAIN_LANGUAGE).forEach(([term, plain]) => {
    simplified = simplified.replace(new RegExp(term, 'gi'), plain)
  })
  return simplified
}
```

### Task 5.5: Senior-Safe Exercise Alternatives

**File:** `src/data/exercises.jsx`

```javascript
export const SENIOR_ALTERNATIVES = {
  pushups: 'wall_pushups',
  squats: 'chair_squats',
  pullups: 'assisted_pullups',
  dips: 'chair_dips',
  vups: 'dead_bugs',
  lunges: 'supported_lunges',
  plank: 'incline_plank',
  supermans: 'bird_dogs'
}

// Chair-based exercise definitions
export const CHAIR_EXERCISES = {
  chair_squats: {
    name: 'Chair Squats',
    description: 'Sit down and stand up using a chair',
    safetyNotes: 'Keep chair against wall for stability'
  },
  // ... etc
}
```

---

## Phase 6: Compassionate Streak System (P2)

**Goal:** Make streaks encouraging, not punishing

### Task 6.1: Streak Configuration

**File:** `src/utils/constants.js`

```javascript
export const STREAK_CONFIG = {
  gracePeriodDays: 1,        // One missed day doesn't break streak
  weekendGrace: true,        // Weekends optional
  partialCredit: true,       // Half workout = half credit
  comebackBonus: true,       // Bonus for returning after break
  maxGraceDays: 2,           // Maximum grace period
  freezeTokens: 3            // "Freeze" days per month
}
```

### Task 6.2: Enhanced Streak Logic

**File:** `src/utils/gamification.js`

```javascript
export const calculateStreakWithGrace = (history, config = STREAK_CONFIG) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let streak = 0
  let graceDaysUsed = 0
  let currentDate = new Date(today)

  while (true) {
    const dateStr = currentDate.toISOString().split('T')[0]
    const dayOfWeek = currentDate.getDay()
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

    const workedOut = history.some(h =>
      h.date.startsWith(dateStr)
    )

    if (workedOut) {
      streak++
      graceDaysUsed = 0 // Reset grace on workout
    } else if (isWeekend && config.weekendGrace) {
      // Weekend grace - doesn't count against or for streak
    } else if (graceDaysUsed < config.gracePeriodDays) {
      graceDaysUsed++
      // Don't break streak, but don't add to it either
    } else {
      break // Streak broken
    }

    currentDate.setDate(currentDate.getDate() - 1)

    // Safety: don't go back more than a year
    if (today - currentDate > 365 * 24 * 60 * 60 * 1000) break
  }

  return {
    streak,
    graceDaysUsed,
    graceRemaining: config.gracePeriodDays - graceDaysUsed
  }
}
```

### Task 6.3: Streak Freeze Feature

**File:** `src/utils/gamification.js`

```javascript
export const useStreakFreeze = (userId) => {
  const freezeKey = `shift6_streak_freezes_${new Date().getMonth()}`
  const freezesUsed = parseInt(localStorage.getItem(freezeKey) || '0')

  if (freezesUsed >= STREAK_CONFIG.freezeTokens) {
    return { success: false, message: 'No freeze tokens remaining this month' }
  }

  localStorage.setItem(freezeKey, String(freezesUsed + 1))
  return {
    success: true,
    remaining: STREAK_CONFIG.freezeTokens - freezesUsed - 1,
    message: 'Streak frozen for today!'
  }
}
```

### Task 6.4: Encouraging Streak UI

**File:** `src/components/Views/Dashboard.jsx`

```javascript
const StreakDisplay = ({ streakData }) => {
  const { streak, graceDaysUsed, graceRemaining } = streakData

  // Missed yesterday but still safe
  if (graceDaysUsed > 0 && graceRemaining > 0) {
    return (
      <div className="streak-warning">
        <span className="flame">🔥</span>
        <span className="count">{streak} day streak</span>
        <span className="grace-note">
          You missed {graceDaysUsed} day - work out today to keep it!
        </span>
      </div>
    )
  }

  // Streak broken but encourage comeback
  if (streak === 0) {
    return (
      <div className="streak-comeback">
        <span>💪 Start a new streak today!</span>
        <span className="subtext">Everyone takes breaks. Let's go!</span>
      </div>
    )
  }

  // Normal streak display
  return (
    <div className="streak-active">
      <span className="flame">🔥</span>
      <span className="count">{streak} day streak!</span>
    </div>
  )
}
```

### Task 6.5: Comeback Celebration

**File:** `src/utils/gamification.js`

```javascript
export const checkComeback = (history) => {
  if (history.length < 2) return null

  const sorted = [...history].sort((a, b) =>
    new Date(b.date) - new Date(a.date)
  )

  const latest = new Date(sorted[0].date)
  const previous = new Date(sorted[1].date)
  const daysBetween = Math.floor((latest - previous) / (1000 * 60 * 60 * 24))

  if (daysBetween >= 7) {
    return {
      type: 'comeback',
      daysMissed: daysBetween,
      badge: 'comeback_kid',
      message: `Welcome back! ${daysBetween} days away, but you're here now! 💪`
    }
  }

  return null
}
```

---

## Implementation Order

### Sprint 1 (P0 - Critical)
1. ✅ Task 1.1: Persona type system
2. ✅ Task 1.2: Persona selection UI
3. ✅ Task 1.3: Store persona in preferences
4. ✅ Task 2.1: Express mode config
5. ✅ Task 2.2: Express mode toggle
6. ✅ Task 2.3: Express workout session

### Sprint 2 (P0 - Critical)
7. Task 2.4: Express dashboard widget
8. Task 2.5: Express program generation
9. Task 3.1: Equipment requirements data
10. Task 3.2: Equipment check in onboarding
11. Task 3.3: Exercise substitution logic
12. Task 3.4: Equipment warning UI

### Sprint 3 (P1 - Important)
13. Task 1.4: Persona-based onboarding flow
14. Task 4.1: Location data model
15. Task 4.2: Location selector component
16. Task 4.3: Location-filtered dashboard
17. Task 4.4: Location in workout history

### Sprint 4 (P1 - Important)
18. Task 5.1: Accessibility preferences
19. Task 5.2: Accessibility settings UI
20. Task 5.3: Apply accessibility styles
21. Task 5.4: Plain language dictionary
22. Task 5.5: Senior-safe alternatives

### Sprint 5 (P2 - Nice to Have)
23. Task 6.1: Streak configuration
24. Task 6.2: Enhanced streak logic
25. Task 6.3: Streak freeze feature
26. Task 6.4: Encouraging streak UI
27. Task 6.5: Comeback celebration

---

## Testing Requirements

### Unit Tests
- `personas.test.js` - Persona detection logic
- `exerciseSubstitution.test.js` - Equipment filtering
- `gamification.test.js` - Updated streak logic

### Integration Tests
- Onboarding flow with each persona
- Express workout completion
- Equipment substitution in dashboard

### Manual Testing Checklist
- [ ] Each persona sees appropriate onboarding
- [ ] Express mode completes in <10 minutes
- [ ] Equipment warnings show correctly
- [ ] Location filter works on dashboard
- [ ] Accessibility settings apply globally
- [ ] Streaks don't break unfairly

---

## Files Changed Summary

| File | Changes |
|------|---------|
| `src/utils/personas.js` | NEW - Persona types and detection |
| `src/utils/exerciseSubstitution.js` | NEW - Equipment filtering |
| `src/utils/language.js` | NEW - Plain language dictionary |
| `src/components/UI/LocationSelector.jsx` | NEW - Location picker |
| `src/components/Views/AccessibilitySettings.jsx` | NEW - Accessibility UI |
| `src/components/Views/Onboarding.jsx` | Add persona step, equipment check |
| `src/components/Views/Dashboard.jsx` | Location filter, equipment warnings |
| `src/components/Views/WorkoutSession.jsx` | Express mode handling |
| `src/components/Views/TrainingSettings.jsx` | Express toggle |
| `src/utils/constants.js` | New storage keys, configs |
| `src/utils/preferences.js` | Persona validation |
| `src/utils/gamification.js` | Enhanced streak logic |
| `src/data/exercises.jsx` | Equipment, location, senior alternatives |
| `src/index.css` | Accessibility styles |
| `src/App.jsx` | Location state, persona integration |
