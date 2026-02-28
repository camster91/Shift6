import { describe, it, expect } from 'vitest'
import {
  PERSONA_TYPES,
  PERSONA_INFO,
  PERSONA_DEFAULTS,
  detectPersona,
  getPersonaDefaults,
  getPersonaInfo,
  getPersonaOnboardingSteps,
  isExpressPersona,
  needsAccessibility,
  isGymPersona,
  isHybridPersona,
  getExerciseFilterForPersona,
  getPersonaAchievements
} from './personas'

describe('Persona Types', () => {
  it('should have 6 persona types defined', () => {
    expect(Object.keys(PERSONA_TYPES)).toHaveLength(6)
  })

  it('should have info for each persona type', () => {
    Object.values(PERSONA_TYPES).forEach(type => {
      expect(PERSONA_INFO[type]).toBeDefined()
      expect(PERSONA_INFO[type].icon).toBeDefined()
      expect(PERSONA_INFO[type].title).toBeDefined()
      expect(PERSONA_INFO[type].description).toBeDefined()
    })
  })

  it('should have defaults for each persona type', () => {
    Object.values(PERSONA_TYPES).forEach(type => {
      expect(PERSONA_DEFAULTS[type]).toBeDefined()
      expect(PERSONA_DEFAULTS[type].programMode).toBeDefined()
      expect(PERSONA_DEFAULTS[type].targetSessionDuration).toBeGreaterThan(0)
    })
  })
})

describe('detectPersona', () => {
  it('should detect busy bee for short session duration', () => {
    const prefs = { targetSessionDuration: 10 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.BUSY_BEE)
  })

  it('should detect busy bee for express mode enabled', () => {
    const prefs = { expressMode: true, targetSessionDuration: 30 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.BUSY_BEE)
  })

  it('should detect golden years for age >= 55', () => {
    const prefs = { userAge: 60, targetSessionDuration: 30 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.GOLDEN_YEARS)
  })

  it('should detect golden years for beginner with short sessions', () => {
    const prefs = { fitnessLevel: 'beginner', targetSessionDuration: 20 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.GOLDEN_YEARS)
  })

  it('should detect competitor for competition goal', () => {
    const prefs = { hasCompetitionGoal: true, targetSessionDuration: 45 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.COMPETITOR)
  })

  it('should detect competitor for advanced strength training', () => {
    const prefs = {
      repScheme: 'strength',
      trainingDaysPerWeek: 6,
      fitnessLevel: 'advanced',
      targetSessionDuration: 60
    }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.COMPETITOR)
  })

  it('should detect gym warrior for gym program mode', () => {
    const prefs = { programMode: 'gym', targetSessionDuration: 45 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.GYM_WARRIOR)
  })

  it('should detect hybrid flex for mixed program mode', () => {
    const prefs = { programMode: 'mixed', targetSessionDuration: 35 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.HYBRID_FLEX)
  })

  it('should default to home hero', () => {
    const prefs = { programMode: 'bodyweight', targetSessionDuration: 30 }
    expect(detectPersona(prefs)).toBe(PERSONA_TYPES.HOME_HERO)
  })
})

describe('getPersonaDefaults', () => {
  it('should return defaults for valid persona', () => {
    const defaults = getPersonaDefaults(PERSONA_TYPES.BUSY_BEE)
    expect(defaults.expressMode).toBe(true)
    expect(defaults.setsPerExercise).toBe(2)
    expect(defaults.targetSessionDuration).toBe(10)
  })

  it('should return home hero defaults for invalid persona', () => {
    const defaults = getPersonaDefaults('invalid_persona')
    expect(defaults).toEqual(PERSONA_DEFAULTS[PERSONA_TYPES.HOME_HERO])
  })

  it('should include accessibility settings for golden years', () => {
    const defaults = getPersonaDefaults(PERSONA_TYPES.GOLDEN_YEARS)
    expect(defaults.accessibility).toBeDefined()
    expect(defaults.accessibility.fontSize).toBe('large')
    expect(defaults.accessibility.simpleLanguage).toBe(true)
  })
})

describe('getPersonaInfo', () => {
  it('should return info for valid persona', () => {
    const info = getPersonaInfo(PERSONA_TYPES.GYM_WARRIOR)
    expect(info.icon).toBe('🏋️')
    expect(info.title).toBe('Gym Regular')
    expect(info.features).toContain('Full equipment access')
  })

  it('should return home hero info for invalid persona', () => {
    const info = getPersonaInfo('invalid_persona')
    expect(info).toEqual(PERSONA_INFO[PERSONA_TYPES.HOME_HERO])
  })
})

describe('getPersonaOnboardingSteps', () => {
  it('should return fewer steps for busy bee', () => {
    const busySteps = getPersonaOnboardingSteps(PERSONA_TYPES.BUSY_BEE)
    const homeSteps = getPersonaOnboardingSteps(PERSONA_TYPES.HOME_HERO)
    expect(busySteps.length).toBeLessThan(homeSteps.length)
  })

  it('should include accessibility step for golden years', () => {
    const steps = getPersonaOnboardingSteps(PERSONA_TYPES.GOLDEN_YEARS)
    expect(steps).toContain('accessibility')
  })

  it('should include competition date for competitor', () => {
    const steps = getPersonaOnboardingSteps(PERSONA_TYPES.COMPETITOR)
    expect(steps).toContain('competition_date')
  })

  it('should include location setup for hybrid', () => {
    const steps = getPersonaOnboardingSteps(PERSONA_TYPES.HYBRID_FLEX)
    expect(steps).toContain('location_setup')
  })
})

describe('Persona type checkers', () => {
  it('isExpressPersona should return true only for busy bee', () => {
    expect(isExpressPersona(PERSONA_TYPES.BUSY_BEE)).toBe(true)
    expect(isExpressPersona(PERSONA_TYPES.HOME_HERO)).toBe(false)
  })

  it('needsAccessibility should return true only for golden years', () => {
    expect(needsAccessibility(PERSONA_TYPES.GOLDEN_YEARS)).toBe(true)
    expect(needsAccessibility(PERSONA_TYPES.BUSY_BEE)).toBe(false)
  })

  it('isGymPersona should return true for gym warrior and competitor', () => {
    expect(isGymPersona(PERSONA_TYPES.GYM_WARRIOR)).toBe(true)
    expect(isGymPersona(PERSONA_TYPES.COMPETITOR)).toBe(true)
    expect(isGymPersona(PERSONA_TYPES.HOME_HERO)).toBe(false)
  })

  it('isHybridPersona should return true only for hybrid flex', () => {
    expect(isHybridPersona(PERSONA_TYPES.HYBRID_FLEX)).toBe(true)
    expect(isHybridPersona(PERSONA_TYPES.GYM_WARRIOR)).toBe(false)
  })
})

describe('getExerciseFilterForPersona', () => {
  it('should filter to no-equipment exercises for busy bee', () => {
    const filter = getExerciseFilterForPersona(PERSONA_TYPES.BUSY_BEE)
    expect(filter({ equipment: 'none' })).toBe(true)
    expect(filter({ equipment: 'barbell' })).toBe(false)
    expect(filter({ equipment: 'none', isComplex: true })).toBe(false)
  })

  it('should filter to safe exercises for golden years', () => {
    const filter = getExerciseFilterForPersona(PERSONA_TYPES.GOLDEN_YEARS)
    expect(filter({ isSafe: true })).toBe(true)
    expect(filter({ isSafe: false })).toBe(false)
    expect(filter({ impact: 'high' })).toBe(false)
    expect(filter({ impact: 'low' })).toBe(true)
  })

  it('should allow all exercises for gym warrior', () => {
    const filter = getExerciseFilterForPersona(PERSONA_TYPES.GYM_WARRIOR)
    expect(filter({ modes: ['gym'], equipment: 'barbell' })).toBe(true)
    expect(filter({ equipment: 'dumbbell' })).toBe(true)
  })

  it('should return no-filter function for unknown persona', () => {
    const filter = getExerciseFilterForPersona('unknown')
    expect(filter({})).toBe(true)
    expect(filter({ anything: 'works' })).toBe(true)
  })
})

describe('getPersonaAchievements', () => {
  it('should include base achievements for all personas', () => {
    Object.values(PERSONA_TYPES).forEach(type => {
      const achievements = getPersonaAchievements(type)
      expect(achievements.some(a => a.id === 'first_workout')).toBe(true)
      expect(achievements.some(a => a.id === 'week_streak')).toBe(true)
    })
  })

  it('should include persona-specific achievements', () => {
    const busyAchievements = getPersonaAchievements(PERSONA_TYPES.BUSY_BEE)
    expect(busyAchievements.some(a => a.id === 'time_efficient')).toBe(true)

    const gymAchievements = getPersonaAchievements(PERSONA_TYPES.GYM_WARRIOR)
    expect(gymAchievements.some(a => a.id === 'iron_addict')).toBe(true)

    const seniorAchievements = getPersonaAchievements(PERSONA_TYPES.GOLDEN_YEARS)
    expect(seniorAchievements.some(a => a.id === 'mobility_master')).toBe(true)
  })
})
