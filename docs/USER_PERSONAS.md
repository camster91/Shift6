# Shift6 User Personas & UX Analysis

## Overview

This document defines 6 key user personas for Shift6, analyzing how the app serves each one, identifying potential pain points, and proposing solutions.

---

## Persona 1: "Home Hero Hannah"
**Pure Home Workout Enthusiast**

### Profile
| Attribute | Value |
|-----------|-------|
| Age | 28-35 |
| Location | Works out at home exclusively |
| Equipment | None or minimal (pull-up bar, resistance bands) |
| Experience | Beginner to intermediate |
| Goals | Stay fit, lose weight, build basic strength |
| Time | 20-30 minutes, 3-4x/week |
| Motivation | Convenience, privacy, no gym anxiety |

### How Shift6 Helps
- ✅ **Core bodyweight exercises** - All 9 exercises need zero equipment
- ✅ **Difficulty scaling** - Can start at wall push-ups (Level 1) and progress
- ✅ **Short sessions** - 20-minute target session fits her schedule
- ✅ **Privacy-first** - No accounts, no sharing required
- ✅ **Offline works** - No internet needed during workouts

### Potential Issues

| Issue | Severity | Current State |
|-------|----------|---------------|
| Pull-up bar required for pull-ups | High | App assumes access |
| No form guidance for beginners | High | Only YouTube links |
| Gets bored with same exercises | Medium | Limited variety in core 9 |
| Doesn't know proper rest times | Medium | Auto-rest may not fit |
| Wants quieter workouts (kids sleeping) | Low | Audio can be muted |

### Solutions

1. **Equipment Filter in Onboarding**
   ```javascript
   // Add to onboarding step 2 (equipment)
   const HOME_EQUIPMENT_OPTIONS = [
     { id: 'none', label: 'No equipment', icon: '🏠' },
     { id: 'pullup_bar', label: 'Pull-up bar', icon: '🔲' },
     { id: 'resistance_bands', label: 'Resistance bands', icon: '🎗️' },
     { id: 'chair', label: 'Sturdy chair (for dips)', icon: '🪑' }
   ]

   // Auto-substitute exercises based on equipment
   if (!hasEquipment('pullup_bar')) {
     replaceExercise('pullups', 'inverted_rows') // Use table rows
   }
   ```

2. **Inline Form Tips**
   - Show 3-second GIF animations during rest periods
   - Add "Common Mistakes" popup on first workout of each exercise
   - Progressive disclosure: more tips for beginners, fewer for advanced

3. **Exercise Rotation System**
   - Suggest variations weekly: "Try Diamond Push-ups this week?"
   - Add "Surprise Me" button for random variation within difficulty

---

## Persona 2: "Gym Bro Gary"
**Dedicated Gym-Goer**

### Profile
| Attribute | Value |
|-----------|-------|
| Age | 22-30 |
| Location | Commercial gym exclusively |
| Equipment | Full gym access (barbells, dumbbells, cables, machines) |
| Experience | Intermediate to advanced |
| Goals | Build muscle (hypertrophy), increase strength, aesthetic physique |
| Time | 45-60 minutes, 5-6x/week |
| Motivation | Visible gains, progressive overload, competition |

### How Shift6 Helps
- ✅ **Gym mode** - Extended library has barbell/dumbbell exercises
- ✅ **Strength rep scheme** - Low reps, longer rest for strength goals
- ✅ **Weight tracking** - `shift6_gym_weights` tracks progression
- ✅ **Advanced difficulty** - Aggressive progression rate (12%/week)
- ✅ **RPE tracking** - Can log intensity per session

### Potential Issues

| Issue | Severity | Current State |
|-------|----------|---------------|
| Bodyweight exercises feel too easy | High | Even Level 6 may bore him |
| No plate/weight calculator | High | Mental math for progressive overload |
| No superset/circuit support | Medium | Linear set-by-set only |
| Gym exercises lack depth | Medium | Generic descriptions |
| Can't track multiple muscle groups per day | Medium | One exercise per session flow |

### Solutions

1. **Weight Progression Calculator**
   ```javascript
   // Add to WorkoutSession for gym exercises
   const suggestNextWeight = (currentWeight, repsAchieved, targetReps) => {
     const performanceRatio = repsAchieved / targetReps
     if (performanceRatio >= 1.2) return currentWeight * 1.05 // +5%
     if (performanceRatio >= 1.0) return currentWeight * 1.025 // +2.5%
     if (performanceRatio < 0.8) return currentWeight * 0.95 // -5%
     return currentWeight
   }

   // Display: "Last time: 135lbs x 8. Try 140lbs today?"
   ```

2. **Multi-Exercise Session Mode**
   ```javascript
   // New workout type: "Full Session"
   const gymSession = {
     type: 'multi_exercise',
     exercises: [
       { key: 'bench_press', sets: 4 },
       { key: 'incline_dumbbell', sets: 3 },
       { key: 'cable_fly', sets: 3 }
     ],
     restBetweenExercises: 120,
     supersets: [[0, 2]] // Bench + Cable fly superset
   }
   ```

3. **Gym-Specific Logging**
   - Add weight/reps per set (not just totals)
   - "1RM Calculator" button: estimate one-rep max from working sets
   - Exercise-specific notes: "Used Smith machine today"

4. **Advanced Bodyweight Challenges**
   - Add Level 7-10 for elite moves: muscle-ups, planche progressions
   - "Weighted calisthenics" mode: weighted pull-ups, weighted dips

---

## Persona 3: "Hybrid Heather"
**Home + Gym Combo User**

### Profile
| Attribute | Value |
|-----------|-------|
| Age | 30-40 |
| Location | Gym 2-3x/week, home 2x/week |
| Equipment | Home: minimal. Gym: full access |
| Experience | Intermediate |
| Goals | General fitness, flexibility, maintain strength |
| Time | 30-45 minutes, 4-5x/week |
| Motivation | Variety, social gym days, convenience on busy days |

### How Shift6 Helps
- ✅ **Mixed mode** - Combines bodyweight + gym exercises
- ✅ **Custom programs** - Can select mix of exercises
- ✅ **Flexible schedule** - Doesn't enforce specific days
- ✅ **Quick home sessions** - Bodyweight when time-crunched

### Potential Issues

| Issue | Severity | Current State |
|-------|----------|---------------|
| Can't tag workouts by location | High | No gym/home filter |
| Progress doesn't sync across contexts | High | Same exercise, different environment |
| Scheduling is confusing | Medium | Preferred days don't account for location |
| Equipment mismatch | Medium | Might plan gym workout but end up at home |

### Solutions

1. **Location-Aware Workout Selection**
   ```javascript
   // Add location tag to sessions
   const WORKOUT_LOCATIONS = ['home', 'gym', 'outdoor', 'travel']

   // Smart filtering on Dashboard
   const getWorkoutsForLocation = (location) => {
     return activeExercises.filter(ex => {
       if (location === 'home') return ex.equipment === 'none' || userHomeEquipment.includes(ex.equipment)
       if (location === 'gym') return true // All exercises available
       if (location === 'travel') return ex.equipment === 'none' && ex.spaceRequired === 'minimal'
     })
   }

   // UI: "Where are you working out today?" → Show relevant exercises
   ```

2. **Equivalent Exercise Mapping**
   ```javascript
   // Map bodyweight ↔ gym equivalents
   const EXERCISE_EQUIVALENTS = {
     pushups: ['bench_press', 'chest_press_machine'],
     pullups: ['lat_pulldown', 'cable_rows'],
     squats: ['barbell_squat', 'leg_press'],
     dips: ['tricep_pushdown', 'close_grip_bench']
   }

   // "Did Bench Press at gym? That counts toward your Push progress!"
   ```

3. **Flexible Day Scheduling**
   ```javascript
   // Enhanced schedule configuration
   const scheduleConfig = {
     weeklyTarget: 5,
     gymDays: [1, 3], // Mon, Wed - gym preferred
     homeDays: [2, 5], // Tue, Fri - home preferred
     flexDays: [6], // Sat - either works
     restDays: [0] // Sun - forced rest
   }
   ```

---

## Persona 4: "Busy Parent Pat"
**Time-Constrained Multi-Tasker**

### Profile
| Attribute | Value |
|-----------|-------|
| Age | 32-45 |
| Location | Home (kids around), occasionally hotel (travel) |
| Equipment | None - uses furniture |
| Experience | Beginner (returning after break) |
| Goals | Basic fitness, energy, stress relief |
| Time | 10-15 minutes, whenever possible |
| Motivation | Health for family, quick wins, flexibility |

### How Shift6 Helps
- ✅ **Quick sessions** - Can do 3-set endurance scheme (15 min)
- ✅ **No equipment** - Kids can't break what you don't have
- ✅ **Offline** - Works in basement with no signal
- ✅ **Mute option** - Silent workouts while kids sleep
- ✅ **Streak tracking** - Motivation through consistency

### Potential Issues

| Issue | Severity | Current State |
|-------|----------|---------------|
| 5-set sessions too long | Critical | Even "short" is 20+ min |
| Interrupted mid-workout | High | No pause/resume intelligence |
| Feels guilty missing days | High | Streak breaks feel punishing |
| Can't do exercises with baby in arms | Medium | No modification suggestions |
| Needs silent/low-impact options | Medium | Jumping exercises disturb others |

### Solutions

1. **Express Workout Mode**
   ```javascript
   // Ultra-short workout option
   const EXPRESS_WORKOUT = {
     sets: 2,
     restBetweenSets: 15, // Faster pace
     targetDuration: 8, // 8 minutes
     exercises: 2, // Quick combo
     label: 'Express (8 min)'
   }

   // Dashboard: "Only have 10 minutes? Try Express Mode 🚀"
   ```

2. **Smart Interruption Handling**
   ```javascript
   // Enhanced session persistence
   const handleInterruption = () => {
     // Auto-save state every 10 seconds
     localStorage.setItem('shift6_interrupted_session', JSON.stringify({
       ...currentSession,
       interruptedAt: Date.now(),
       completedSets: setIndex,
       partialReps: currentReps
     }))
   }

   // On app open: "Welcome back! Continue your Push-ups? (2/5 sets done)"
   ```

3. **Compassionate Streak System**
   ```javascript
   // Forgiving streak logic
   const STREAK_CONFIG = {
     graceDays: 1, // One missed day doesn't break streak
     weekendGrace: true, // Weekends don't count against streak
     comebackBonus: true, // "Welcome back!" badge after break
     partialCredit: true // Half workout = half day credit
   }

   // "You missed yesterday, but your streak is safe! Keep going 💪"
   ```

4. **Low-Impact Filter**
   ```javascript
   // Add impact level to exercises
   const IMPACT_LEVELS = {
     pushups: 'low', // Quiet
     squats: 'low', // Quiet
     jumpSquats: 'high', // Loud/disturbing
     lunges: 'low',
     burpees: 'high'
   }

   // "Quiet Mode" toggle filters out high-impact exercises
   ```

---

## Persona 5: "Senior Steve"
**Older Adult Fitness Seeker**

### Profile
| Attribute | Value |
|-----------|-------|
| Age | 55-70 |
| Location | Home or community center |
| Equipment | Chair for support, maybe resistance bands |
| Experience | Beginner (new to structured fitness) |
| Goals | Mobility, bone density, independence, fall prevention |
| Time | 20-30 minutes, 3x/week |
| Motivation | Health, longevity, doctor's recommendation |

### How Shift6 Helps
- ✅ **Difficulty Level 1** - Assisted variations (wall push-ups, etc.)
- ✅ **Beginner preset** - Conservative progression (5%/week)
- ✅ **Endurance scheme** - Higher reps, lighter intensity
- ✅ **Visual progress** - Motivating to see improvement

### Potential Issues

| Issue | Severity | Critical |
|-------|----------|----------|
| UI text too small | Critical | Accessibility issue |
| Exercises assume mobility | High | Can't get on floor easily |
| No warmup emphasis | High | Injury risk without proper warmup |
| Confusing terminology | Medium | "AMRAP", "RPE" are jargon |
| Haptics/sounds may startle | Low | Unexpected feedback |

### Solutions

1. **Accessibility Settings**
   ```javascript
   // New settings section: Accessibility
   const ACCESSIBILITY_OPTIONS = {
     fontSize: 'normal' | 'large' | 'extra-large',
     highContrast: false,
     reducedMotion: true, // Respect prefers-reduced-motion
     simpleLanguage: true, // Replace jargon
     longerTimers: true, // 2x rest time default
     voiceInstructions: false // TTS for exercise cues
   }

   // Apply: <html style={{ fontSize: fontSize === 'extra-large' ? '20px' : '16px' }}>
   ```

2. **Senior-Friendly Exercise Alternatives**
   ```javascript
   // Chair-based alternatives
   const CHAIR_EXERCISES = {
     pushups: 'chair_pushups', // Hands on chair back
     squats: 'chair_squats', // Sit-to-stand
     lunges: 'supported_lunges', // Hold chair for balance
     plank: 'chair_plank', // Incline plank on chair
     dips: 'chair_dips', // Standard chair dips
   }

   // "Senior Mode" auto-selects these alternatives
   ```

3. **Mandatory Warmup Flow**
   ```javascript
   // For senior/beginner users, enforce warmup
   const shouldRequireWarmup = (fitnessLevel, age) => {
     return fitnessLevel === 'beginner' || age >= 50
   }

   // Warmup includes:
   // - Joint circles (2 min)
   // - Light marching (2 min)
   // - Dynamic stretches (3 min)
   // - Gradual intensity buildup
   ```

4. **Plain Language Mode**
   ```javascript
   // Jargon → Plain language mapping
   const PLAIN_LANGUAGE = {
     'AMRAP': 'As Many As You Can',
     'RPE': 'How Hard It Felt (1-10)',
     'Superset': 'Back-to-Back Exercises',
     'Hypertrophy': 'Muscle Building',
     'Progressive Overload': 'Gradually Doing More',
     'Deload': 'Easy Recovery Week'
   }
   ```

---

## Persona 6: "Athlete Alex"
**Competitive/Sport-Specific Trainer**

### Profile
| Attribute | Value |
|-----------|-------|
| Age | 18-35 |
| Location | Gym, home, outdoor track/field |
| Equipment | Full access + sport-specific gear |
| Experience | Advanced |
| Goals | Sport performance, explosiveness, competition prep |
| Time | 60-90 minutes, 6x/week |
| Motivation | Competition, PRs, team/coach requirements |

### How Shift6 Helps
- ✅ **Advanced preset** - Aggressive progression (12%/week)
- ✅ **Strength scheme** - Low rep, high intensity
- ✅ **PR tracking** - Celebrates new personal records
- ✅ **Data export** - Can share CSV with coach

### Potential Issues

| Issue | Severity | Current State |
|-------|----------|---------------|
| No periodization support | Critical | Linear progression only |
| Can't plan peaking/tapering | High | No competition date awareness |
| No explosive/plyometric exercises | High | Limited to slow controlled moves |
| Can't track sport-specific metrics | Medium | Only reps/time, not speed/distance |
| No coach sharing/sync | Medium | Manual export only |

### Solutions

1. **Periodization Planning**
   ```javascript
   // Add periodization blocks
   const PERIODIZATION_PHASES = {
     base: { weeks: 4, intensity: 'moderate', volume: 'high' },
     build: { weeks: 4, intensity: 'high', volume: 'moderate' },
     peak: { weeks: 2, intensity: 'maximum', volume: 'low' },
     taper: { weeks: 1, intensity: 'light', volume: 'minimal' },
     competition: { weeks: 1, intensity: 'event', volume: 'event' }
   }

   // "Set your competition date" → Auto-plan backwards
   const planForCompetition = (competitionDate) => {
     const weeksOut = getWeeksBetween(today, competitionDate)
     return generatePeriodizedPlan(weeksOut)
   }
   ```

2. **Explosive Exercise Library**
   ```javascript
   // Add plyometric exercises
   const PLYOMETRIC_EXERCISES = [
     { key: 'box_jumps', category: 'power', metrics: ['height', 'reps'] },
     { key: 'depth_jumps', category: 'power', metrics: ['height', 'ground_contact'] },
     { key: 'clap_pushups', category: 'power', metrics: ['reps', 'height'] },
     { key: 'jump_squats', category: 'power', metrics: ['reps', 'height'] },
     { key: 'broad_jumps', category: 'power', metrics: ['distance'] },
     { key: 'sprints', category: 'speed', metrics: ['distance', 'time'] },
     { key: 'agility_ladder', category: 'agility', metrics: ['time', 'pattern'] }
   ]
   ```

3. **Extended Metrics Tracking**
   ```javascript
   // Sport-specific metrics
   const ATHLETE_METRICS = {
     vertical_jump: { unit: 'inches', trackingFrequency: 'weekly' },
     forty_yard_dash: { unit: 'seconds', trackingFrequency: 'monthly' },
     mile_time: { unit: 'minutes', trackingFrequency: 'monthly' },
     body_composition: { unit: 'percentage', trackingFrequency: 'monthly' }
   }

   // "Test Day" - periodic assessment of key metrics
   ```

4. **Coach Integration**
   ```javascript
   // Share with coach feature
   const shareWithCoach = async () => {
     const report = generateAthleteReport({
       period: 'last_4_weeks',
       includeMetrics: true,
       includeNotes: true,
       format: 'pdf' // or 'csv', 'json'
     })

     // Options:
     // - Email report
     // - Generate shareable link (temporary)
     // - Export to TrainingPeaks/other platforms
   }
   ```

---

## Cross-Persona Issues & Universal Solutions

### Issue 1: One-Size-Fits-All Onboarding
**Problem**: Current onboarding is the same for everyone

**Solution**: Persona-Based Onboarding Paths
```javascript
const ONBOARDING_PATHS = {
  home_beginner: {
    steps: ['welcome', 'equipment_home', 'goals_simple', 'schedule_flexible', 'program_guided'],
    defaults: { fitnessLevel: 'beginner', mode: 'bodyweight', repScheme: 'endurance' }
  },
  gym_regular: {
    steps: ['welcome', 'equipment_gym', 'goals_detailed', 'split_selection', 'program_templates'],
    defaults: { fitnessLevel: 'intermediate', mode: 'gym', repScheme: 'hypertrophy' }
  },
  hybrid_flexible: {
    steps: ['welcome', 'location_setup', 'equipment_both', 'schedule_complex', 'program_custom'],
    defaults: { fitnessLevel: 'intermediate', mode: 'mixed', repScheme: 'balanced' }
  },
  time_constrained: {
    steps: ['welcome', 'time_budget', 'quick_goals', 'express_setup'],
    defaults: { fitnessLevel: 'beginner', repScheme: 'endurance', targetDuration: 15 }
  },
  senior: {
    steps: ['welcome', 'accessibility', 'health_check', 'goals_gentle', 'program_safe'],
    defaults: { fitnessLevel: 'beginner', mode: 'bodyweight', repScheme: 'endurance' }
  },
  athlete: {
    steps: ['welcome', 'sport_selection', 'competition_dates', 'periodization', 'program_advanced'],
    defaults: { fitnessLevel: 'advanced', repScheme: 'strength', progressionRate: 'aggressive' }
  }
}

// First screen: "What best describes you?"
// - "I want to work out at home" → home_beginner
// - "I go to the gym regularly" → gym_regular
// - "I mix home and gym workouts" → hybrid_flexible
// - "I only have 10-15 minutes" → time_constrained
// - "I'm over 50 or new to exercise" → senior
// - "I'm training for a sport/competition" → athlete
```

### Issue 2: Progress Doesn't Feel Personal
**Problem**: Same badges, same milestones for everyone

**Solution**: Persona-Contextual Achievements
```javascript
const CONTEXTUAL_ACHIEVEMENTS = {
  home_hero: [
    { id: 'living_room_legend', desc: 'Complete 20 home workouts' },
    { id: 'no_equipment_needed', desc: 'Master 5 bodyweight exercises' },
    { id: 'home_streak', desc: '14-day home workout streak' }
  ],
  gym_warrior: [
    { id: 'iron_addict', desc: 'Log 50 gym sessions' },
    { id: 'weight_room_regular', desc: 'Train 5 days in one week' },
    { id: 'pr_crusher', desc: 'Set 10 personal records' }
  ],
  busy_bee: [
    { id: 'time_efficient', desc: 'Complete 10 express workouts' },
    { id: 'consistency_champion', desc: 'Work out 3x/week for a month' },
    { id: 'micro_gains', desc: 'Improve in 10-minute sessions' }
  ],
  golden_years: [
    { id: 'mobility_master', desc: 'Complete all warmup routines' },
    { id: 'steady_progress', desc: 'Improve for 6 consecutive weeks' },
    { id: 'balance_builder', desc: 'Complete 20 single-leg exercises' }
  ],
  competitor: [
    { id: 'peak_performer', desc: 'Complete a periodized training block' },
    { id: 'explosive_power', desc: 'Master 5 plyometric exercises' },
    { id: 'game_day_ready', desc: 'Complete taper week before competition' }
  ]
}
```

### Issue 3: No Recovery Intelligence
**Problem**: App doesn't know when user is tired/sore

**Solution**: Recovery-Aware Scheduling
```javascript
// Pre-workout readiness check
const READINESS_CHECK = {
  questions: [
    { id: 'sleep', question: 'How did you sleep?', options: ['Poor', 'Okay', 'Great'] },
    { id: 'soreness', question: 'How sore are you?', options: ['Very', 'Somewhat', 'Not at all'] },
    { id: 'energy', question: 'Energy level?', options: ['Low', 'Normal', 'High'] },
    { id: 'stress', question: 'Stress level?', options: ['High', 'Normal', 'Low'] }
  ],

  calculateReadiness: (answers) => {
    const score = answers.reduce((sum, a) => sum + a.value, 0) / answers.length
    if (score < 0.4) return 'low' // Suggest rest or light workout
    if (score < 0.7) return 'moderate' // Normal workout
    return 'high' // Push harder
  }
}

// Adaptive suggestions based on readiness
const getWorkoutSuggestion = (readiness) => {
  switch (readiness) {
    case 'low':
      return {
        message: "Your body might need rest. How about a light stretching session?",
        options: ['Rest Day', 'Light Workout (50%)', 'I feel fine, full workout']
      }
    case 'moderate':
      return { message: "Ready for a normal workout!", options: ['Start Workout'] }
    case 'high':
      return { message: "You're feeling great! Want to push harder today?", options: ['Normal', 'Challenge Mode'] }
  }
}
```

### Issue 4: Data Lock-In
**Problem**: No way to move data between devices or share with other apps

**Solution**: Enhanced Import/Export
```javascript
const DATA_PORTABILITY = {
  export: {
    formats: ['json', 'csv', 'pdf'],
    targets: ['local', 'email', 'cloud_backup'],
    includes: ['workouts', 'progress', 'settings', 'achievements']
  },
  import: {
    formats: ['json', 'csv'],
    sources: ['file', 'url', 'other_apps'],
    mapping: {
      // Map other app formats to Shift6
      'strong_app': mapStrongData,
      'hevy_app': mapHevyData,
      'fitbod': mapFitbodData
    }
  },
  sync: {
    // Future: optional cloud sync
    providers: ['icloud', 'google_drive', 'dropbox'],
    frequency: 'on_change',
    conflict_resolution: 'latest_wins'
  }
}
```

---

## Implementation Priority Matrix

| Solution | Personas Helped | Effort | Impact | Priority |
|----------|-----------------|--------|--------|----------|
| Express Workout Mode | Pat, Heather | Low | High | **P0** |
| Persona-Based Onboarding | All | Medium | High | **P0** |
| Equipment-Smart Filtering | Hannah, Heather | Medium | High | **P0** |
| Accessibility Settings | Steve | Medium | High | **P1** |
| Multi-Exercise Sessions | Gary, Alex | High | High | **P1** |
| Location-Aware Workouts | Heather | Medium | Medium | **P1** |
| Recovery/Readiness Check | All | Medium | Medium | **P2** |
| Periodization Planning | Alex | High | Medium | **P2** |
| Compassionate Streaks | Pat | Low | Medium | **P2** |
| Weight Progression Calculator | Gary | Low | Medium | **P2** |
| Senior Exercise Alternatives | Steve | Medium | Medium | **P2** |
| Coach Sharing | Alex | High | Low | **P3** |
| Import from Other Apps | All | High | Low | **P3** |

---

## Summary: Making Shift6 Universal

The key insight is that **one app can serve all personas** by:

1. **Smart defaults with easy overrides** - Detect user type early, preset everything, but allow changes
2. **Modular features** - Express mode, senior mode, athlete mode are toggles, not separate apps
3. **Contextual UI** - Show relevant options based on user profile (hide gym features from home users)
4. **Progressive disclosure** - Beginners see simple UI, advanced users can unlock complexity
5. **Flexible data model** - Same core (exercises, sets, reps) with persona-specific extensions

The app already has 80% of the foundation. The remaining 20% is **persona awareness** - knowing who the user is and adapting accordingly.
