import { Home, Dumbbell, TreePine, Plane } from 'lucide-react'
import { WORKOUT_LOCATIONS } from '../../utils/constants'
import { vibrate } from '../../utils/device'

/**
 * Location options with icons and labels
 */
const LOCATION_OPTIONS = [
  {
    id: WORKOUT_LOCATIONS.HOME,
    icon: Home,
    label: 'Home',
    description: 'Bodyweight & home equipment'
  },
  {
    id: WORKOUT_LOCATIONS.GYM,
    icon: Dumbbell,
    label: 'Gym',
    description: 'Full equipment access'
  },
  {
    id: WORKOUT_LOCATIONS.OUTDOOR,
    icon: TreePine,
    label: 'Outdoor',
    description: 'Park, playground, or outdoor gym'
  },
  {
    id: WORKOUT_LOCATIONS.TRAVEL,
    icon: Plane,
    label: 'Travel',
    description: 'Hotel or minimal space'
  }
]

/**
 * LocationSelector Component
 * Allows users to select their current workout location
 * @param {Object} props
 * @param {string} props.currentLocation - Currently selected location ID
 * @param {Function} props.onSelect - Callback when location is selected
 * @param {string} props.variant - 'full' | 'compact' - Display variant
 */
const LocationSelector = ({ currentLocation, onSelect, variant = 'full' }) => {
  const handleSelect = (locationId) => {
    vibrate(20)
    onSelect(locationId)
  }

  if (variant === 'compact') {
    return (
      <div className="flex gap-2">
        {LOCATION_OPTIONS.map(loc => {
          const Icon = loc.icon
          const isSelected = currentLocation === loc.id
          return (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc.id)}
              className={`p-2 rounded-lg transition-all ${
                isSelected
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                  : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
              } border`}
              title={loc.label}
            >
              <Icon size={18} />
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-400">Where are you working out?</p>
      <div className="grid grid-cols-2 gap-3">
        {LOCATION_OPTIONS.map(loc => {
          const Icon = loc.icon
          const isSelected = currentLocation === loc.id
          return (
            <button
              key={loc.id}
              onClick={() => handleSelect(loc.id)}
              className={`p-4 rounded-xl transition-all text-left ${
                isSelected
                  ? 'bg-cyan-500/10 border-cyan-500'
                  : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
              } border`}
            >
              <div className="flex items-center gap-3 mb-1">
                <Icon
                  size={20}
                  className={isSelected ? 'text-cyan-400' : 'text-slate-400'}
                />
                <span className={`font-medium ${isSelected ? 'text-cyan-400' : 'text-white'}`}>
                  {loc.label}
                </span>
              </div>
              <p className="text-xs text-slate-500">{loc.description}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Infer exercise locations from existing properties
 * @param {Object} exercise - Exercise definition
 * @returns {string[]} - Array of compatible location IDs
 */
export const inferExerciseLocations = (exercise) => {
  if (!exercise) return []

  // If exercise has explicit locations, use those
  if (exercise.locations && exercise.locations.length > 0) {
    return exercise.locations
  }

  const locations = []
  const equipment = exercise.equipment || ['none']
  const modes = exercise.modes || ['bodyweight']

  // Bodyweight exercises with no equipment work everywhere
  const isBodyweight = equipment.includes('none') || equipment.length === 0
  const requiresGymEquipment = equipment.some(eq =>
    ['barbell', 'cable', 'machine', 'rack'].includes(eq)
  )

  // Home: bodyweight or home-compatible equipment
  if (isBodyweight || modes.includes('bodyweight')) {
    locations.push(WORKOUT_LOCATIONS.HOME)
  }

  // Gym: all exercises except pure outdoor
  if (!exercise.outdoorOnly) {
    locations.push(WORKOUT_LOCATIONS.GYM)
  }

  // Outdoor: bodyweight or exercises marked for outdoor
  if (isBodyweight && !requiresGymEquipment) {
    locations.push(WORKOUT_LOCATIONS.OUTDOOR)
  }

  // Travel: only pure bodyweight, no equipment
  if (isBodyweight && !requiresGymEquipment && equipment.every(e => e === 'none')) {
    locations.push(WORKOUT_LOCATIONS.TRAVEL)
  }

  // Default to home and gym if nothing else matches
  if (locations.length === 0) {
    return [WORKOUT_LOCATIONS.HOME, WORKOUT_LOCATIONS.GYM]
  }

  return locations
}

/**
 * Get exercises available at a specific location
 * @param {string} location - Location ID
 * @param {Object} allExercises - All exercise definitions
 * @returns {string[]} - Array of available exercise keys
 */
export const getExercisesForLocation = (location, allExercises) => {
  return Object.keys(allExercises).filter(key => {
    const exercise = allExercises[key]
    if (!exercise) return false

    // Get compatible locations for this exercise
    const exerciseLocations = inferExerciseLocations(exercise)

    if (!exerciseLocations.includes(location)) {
      return false
    }

    // For travel, only allow no-equipment exercises
    if (location === WORKOUT_LOCATIONS.TRAVEL) {
      const requiresEquipment = exercise.equipment &&
        !exercise.equipment.includes('none') &&
        exercise.equipment.length > 0
      if (requiresEquipment) return false
    }

    return true
  })
}

/**
 * Get location badge color class
 * @param {string} location - Location ID
 * @returns {string} - Tailwind color classes
 */
export const getLocationColor = (location) => {
  switch (location) {
    case WORKOUT_LOCATIONS.HOME:
      return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30'
    case WORKOUT_LOCATIONS.GYM:
      return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
    case WORKOUT_LOCATIONS.OUTDOOR:
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case WORKOUT_LOCATIONS.TRAVEL:
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    default:
      return 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  }
}

/**
 * Get location icon component
 * @param {string} location - Location ID
 * @returns {Function} - Icon component
 */
export const getLocationIcon = (location) => {
  const option = LOCATION_OPTIONS.find(o => o.id === location)
  return option?.icon || Home
}

export default LocationSelector
