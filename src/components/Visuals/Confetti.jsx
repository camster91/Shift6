import { useEffect, useState, useCallback } from 'react'

/**
 * Confetti particle configuration
 */
const COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#ef4444']

const createParticle = (id, containerWidth) => ({
  id,
  x: Math.random() * containerWidth,
  y: -20,
  size: Math.random() * 10 + 5,
  color: COLORS[Math.floor(Math.random() * COLORS.length)],
  rotation: Math.random() * 360,
  velocityX: (Math.random() - 0.5) * 8,
  velocityY: Math.random() * 3 + 2,
  rotationSpeed: (Math.random() - 0.5) * 10,
  shape: Math.random() > 0.5 ? 'square' : 'circle',
  opacity: 1,
})

/**
 * Confetti celebration animation component
 * @param {Object} props
 * @param {boolean} props.active - Whether confetti is active
 * @param {number} props.duration - Duration in ms (default 3000)
 * @param {number} props.particleCount - Number of particles (default 50)
 * @param {function} props.onComplete - Callback when animation completes
 */
const Confetti = ({ active, duration = 3000, particleCount = 50, onComplete }) => {
  const [particles, setParticles] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  const initParticles = useCallback(() => {
    const width = window.innerWidth
    const newParticles = []
    for (let i = 0; i < particleCount; i++) {
      newParticles.push(createParticle(i, width))
    }
    return newParticles
  }, [particleCount])

  useEffect(() => {
    if (active && !isRunning) {
      setIsRunning(true)
      setParticles(initParticles())

      const timeout = setTimeout(() => {
        setIsRunning(false)
        setParticles([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timeout)
    }
  }, [active, isRunning, duration, initParticles, onComplete])

  useEffect(() => {
    if (!isRunning || particles.length === 0) return

    const animationFrame = requestAnimationFrame(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.velocityX,
        y: p.y + p.velocityY,
        rotation: p.rotation + p.rotationSpeed,
        velocityY: p.velocityY + 0.1, // gravity
        opacity: Math.max(0, p.opacity - 0.01),
      })).filter(p => p.y < window.innerHeight + 50 && p.opacity > 0))
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [isRunning, particles])

  if (!isRunning) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
            transition: 'none',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Burst confetti from a specific point
 */
export const ConfettiBurst = ({ active, x = '50%', y = '50%', duration = 2000, onComplete }) => {
  const [particles, setParticles] = useState([])
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {
    if (active && !isRunning) {
      setIsRunning(true)
      const centerX = typeof x === 'string' ? window.innerWidth / 2 : x
      const centerY = typeof y === 'string' ? window.innerHeight / 2 : y

      const newParticles = []
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 2
        const velocity = Math.random() * 8 + 4
        newParticles.push({
          id: i,
          x: centerX,
          y: centerY,
          size: Math.random() * 8 + 4,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          velocityX: Math.cos(angle) * velocity,
          velocityY: Math.sin(angle) * velocity - 5,
          rotation: Math.random() * 360,
          rotationSpeed: (Math.random() - 0.5) * 15,
          opacity: 1,
          shape: Math.random() > 0.3 ? 'square' : 'circle',
        })
      }
      setParticles(newParticles)

      const timeout = setTimeout(() => {
        setIsRunning(false)
        setParticles([])
        onComplete?.()
      }, duration)

      return () => clearTimeout(timeout)
    }
  }, [active, isRunning, x, y, duration, onComplete])

  useEffect(() => {
    if (!isRunning || particles.length === 0) return

    const animationFrame = requestAnimationFrame(() => {
      setParticles(prev => prev.map(p => ({
        ...p,
        x: p.x + p.velocityX,
        y: p.y + p.velocityY,
        velocityY: p.velocityY + 0.3,
        velocityX: p.velocityX * 0.98,
        rotation: p.rotation + p.rotationSpeed,
        opacity: Math.max(0, p.opacity - 0.02),
      })).filter(p => p.opacity > 0))
    })

    return () => cancelAnimationFrame(animationFrame)
  }, [isRunning, particles])

  if (!isRunning) return null

  return (
    <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            borderRadius: p.shape === 'circle' ? '50%' : '2px',
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
          }}
        />
      ))}
    </div>
  )
}

export default Confetti
