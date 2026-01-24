import { describe, it, expect } from 'vitest'
import {
  EXERCISE_EQUIPMENT,
  HOME_EQUIPMENT_OPTIONS,
  checkEquipmentForExercise,
  getSubstituteExercise,
  filterProgramByEquipment,
  getAvailableExercises,
  getEquipmentWarning,
  getSeniorAlternative,
  isSeniorSafe
} from './exerciseSubstitution'

describe('EXERCISE_EQUIPMENT', () => {
  it('should have equipment info for core 9 exercises', () => {
    const coreExercises = ['pushups', 'squats', 'pullups', 'dips', 'vups', 'glutebridge', 'plank', 'lunges', 'supermans']
    coreExercises.forEach(ex => {
      expect(EXERCISE_EQUIPMENT[ex]).toBeDefined()
      expect(EXERCISE_EQUIPMENT[ex].category).toBeDefined()
    })
  })

  it('should mark pullups as requiring pullup_bar', () => {
    expect(EXERCISE_EQUIPMENT.pullups.required).toContain('pullup_bar')
  })

  it('should mark bodyweight exercises as requiring nothing', () => {
    expect(EXERCISE_EQUIPMENT.pushups.required).toHaveLength(0)
    expect(EXERCISE_EQUIPMENT.squats.required).toHaveLength(0)
    expect(EXERCISE_EQUIPMENT.plank.required).toHaveLength(0)
  })
})

describe('HOME_EQUIPMENT_OPTIONS', () => {
  it('should have at least 5 equipment options', () => {
    expect(HOME_EQUIPMENT_OPTIONS.length).toBeGreaterThanOrEqual(5)
  })

  it('should have id, label, and icon for each option', () => {
    HOME_EQUIPMENT_OPTIONS.forEach(option => {
      expect(option.id).toBeDefined()
      expect(option.label).toBeDefined()
      expect(option.icon).toBeDefined()
    })
  })

  it('should include none option', () => {
    expect(HOME_EQUIPMENT_OPTIONS.find(o => o.id === 'none')).toBeDefined()
  })
})

describe('checkEquipmentForExercise', () => {
  it('should return hasRequired true for exercises with no requirements', () => {
    const result = checkEquipmentForExercise('pushups', [])
    expect(result.hasRequired).toBe(true)
    expect(result.missing).toHaveLength(0)
  })

  it('should return hasRequired false for pullups without bar', () => {
    const result = checkEquipmentForExercise('pullups', [])
    expect(result.hasRequired).toBe(false)
    expect(result.missing).toContain('pullup_bar')
  })

  it('should return hasRequired true for pullups with bar', () => {
    const result = checkEquipmentForExercise('pullups', ['pullup_bar'])
    expect(result.hasRequired).toBe(true)
  })

  it('should handle unknown exercises gracefully', () => {
    const result = checkEquipmentForExercise('unknown_exercise', [])
    expect(result.hasRequired).toBe(true)
  })

  it('should check alternatives when required equipment is missing', () => {
    // Dips can use chair as alternative
    const result = checkEquipmentForExercise('dips', ['chair'])
    expect(result.hasRequired).toBe(true)
  })
})

describe('getSubstituteExercise', () => {
  it('should return null when equipment is available', () => {
    const result = getSubstituteExercise('pullups', ['pullup_bar'])
    expect(result).toBeNull()
  })

  it('should return substitute for pullups without bar', () => {
    const result = getSubstituteExercise('pullups', ['table'])
    expect(result).not.toBeNull()
    expect(result.substituteKey).toBe('inverted_rows')
    expect(result.reason).toBeDefined()
  })

  it('should return null when no substitute available', () => {
    // If we can't do the substitute either
    const result = getSubstituteExercise('pullups', [])
    expect(result).toBeNull()
  })
})

describe('filterProgramByEquipment', () => {
  it('should return all exercises as available when equipment is present', () => {
    const program = ['pushups', 'squats', 'pullups']
    const result = filterProgramByEquipment(program, ['pullup_bar'])
    expect(result.available).toContain('pushups')
    expect(result.available).toContain('squats')
    expect(result.available).toContain('pullups')
    expect(result.unavailable).toHaveLength(0)
  })

  it('should substitute pullups when no bar but has table', () => {
    const program = ['pushups', 'pullups']
    const result = filterProgramByEquipment(program, ['table'])
    expect(result.available).toContain('pushups')
    expect(result.available).toContain('inverted_rows')
    expect(result.substituted).toHaveLength(1)
    expect(result.substituted[0].original).toBe('pullups')
  })

  it('should mark exercises as unavailable when no substitute possible', () => {
    const program = ['pushups', 'pullups']
    const result = filterProgramByEquipment(program, [])
    expect(result.available).toContain('pushups')
    expect(result.unavailable).toContain('pullups')
  })
})

describe('getAvailableExercises', () => {
  it('should filter exercises based on equipment', () => {
    const exercises = {
      pushups: {},
      pullups: {},
      squats: {}
    }
    const available = getAvailableExercises(['pullup_bar'], exercises)
    expect(available).toContain('pushups')
    expect(available).toContain('pullups')
    expect(available).toContain('squats')
  })

  it('should exclude exercises requiring unavailable equipment', () => {
    const exercises = {
      pushups: {},
      pullups: {}
    }
    const available = getAvailableExercises([], exercises)
    expect(available).toContain('pushups')
    expect(available).not.toContain('pullups')
  })
})

describe('getEquipmentWarning', () => {
  it('should return null when equipment is available', () => {
    const warning = getEquipmentWarning('pullups', ['pullup_bar'])
    expect(warning).toBeNull()
  })

  it('should return substitution warning when substitute available', () => {
    const warning = getEquipmentWarning('pullups', ['table'])
    expect(warning).not.toBeNull()
    expect(warning.type).toBe('substitution')
    expect(warning.substitute).toBe('inverted_rows')
  })

  it('should return unavailable warning when no substitute', () => {
    const warning = getEquipmentWarning('pullups', [])
    expect(warning).not.toBeNull()
    expect(warning.type).toBe('unavailable')
    expect(warning.missing).toContain('pullup_bar')
  })
})

describe('getSeniorAlternative', () => {
  it('should return alternative for known exercises', () => {
    expect(getSeniorAlternative('pushups')).toBe('wall_pushups')
    expect(getSeniorAlternative('squats')).toBe('chair_squats')
    expect(getSeniorAlternative('vups')).toBe('dead_bugs')
  })

  it('should return original for unknown exercises', () => {
    expect(getSeniorAlternative('unknown_exercise')).toBe('unknown_exercise')
  })
})

describe('isSeniorSafe', () => {
  it('should return false for null exercise', () => {
    expect(isSeniorSafe(null)).toBe(false)
  })

  it('should return false for exercises marked unsafe', () => {
    expect(isSeniorSafe({ isSafe: false })).toBe(false)
  })

  it('should return false for high impact exercises', () => {
    expect(isSeniorSafe({ impact: 'high' })).toBe(false)
  })

  it('should return false for plyometric exercises', () => {
    expect(isSeniorSafe({ category: 'plyometric' })).toBe(false)
  })

  it('should return true for safe exercises', () => {
    expect(isSeniorSafe({ category: 'push', impact: 'low' })).toBe(true)
    expect(isSeniorSafe({})).toBe(true)
  })
})
