import { chromium } from 'playwright'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const outputDir = path.join(__dirname, '..', 'store-assets', 'screenshots')

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true })
}

// Google Play phone screenshot: 1080x1920
const VIEWPORT = { width: 412, height: 915 }
const DEVICE_SCALE = 2.625 // Results in ~1080x2402 actual pixels

// Sample workout data to seed localStorage
const SEED_DATA = {
  shift6_progress: JSON.stringify({
    pushups: ['day1', 'day2', 'day3', 'day4', 'day5'],
    squats: ['day1', 'day2', 'day3', 'day4'],
    pullups: ['day1', 'day2', 'day3'],
    dips: ['day1', 'day2'],
    vups: ['day1', 'day2', 'day3', 'day4', 'day5'],
    glutebridge: ['day1', 'day2', 'day3'],
    plank: ['day1', 'day2'],
    lunges: ['day1', 'day2', 'day3'],
    supermans: ['day1', 'day2', 'day3', 'day4']
  }),
  shift6_history: JSON.stringify([
    { exerciseKey: 'pushups', dayId: 'day5', date: new Date().toISOString(), volume: 50, unit: 'reps' },
    { exerciseKey: 'squats', dayId: 'day4', date: new Date(Date.now() - 86400000).toISOString(), volume: 80, unit: 'reps' },
    { exerciseKey: 'pullups', dayId: 'day3', date: new Date(Date.now() - 86400000).toISOString(), volume: 15, unit: 'reps' },
    { exerciseKey: 'vups', dayId: 'day5', date: new Date(Date.now() - 172800000).toISOString(), volume: 40, unit: 'reps' },
    { exerciseKey: 'plank', dayId: 'day2', date: new Date(Date.now() - 172800000).toISOString(), volume: 90, unit: 'seconds' },
    { exerciseKey: 'lunges', dayId: 'day3', date: new Date(Date.now() - 259200000).toISOString(), volume: 30, unit: 'reps/leg' },
    { exerciseKey: 'pushups', dayId: 'day4', date: new Date(Date.now() - 259200000).toISOString(), volume: 45, unit: 'reps' },
    { exerciseKey: 'squats', dayId: 'day3', date: new Date(Date.now() - 345600000).toISOString(), volume: 60, unit: 'reps' },
    { exerciseKey: 'dips', dayId: 'day2', date: new Date(Date.now() - 345600000).toISOString(), volume: 20, unit: 'reps' },
    { exerciseKey: 'supermans', dayId: 'day4', date: new Date(Date.now() - 432000000).toISOString(), volume: 35, unit: 'reps' },
  ]),
  shift6_home_goals: JSON.stringify({
    pushups: { target: 100, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    squats: { target: 200, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    pullups: { target: 50, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    dips: { target: 50, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    vups: { target: 100, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    glutebridge: { target: 50, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    plank: { target: 180, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    lunges: { target: 50, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
    supermans: { target: 100, startDate: new Date(Date.now() - 14 * 86400000).toISOString() },
  }),
  shift6_theme: JSON.stringify('dark'),
  shift6_onboarding_complete: JSON.stringify(true),
  shift6_audio_enabled: JSON.stringify(false),
  shift6_streak: JSON.stringify({ current: 5, longest: 12, lastDate: new Date().toISOString().split('T')[0] }),
  shift6_training_mode: JSON.stringify('home'),
}

async function seedLocalStorage(page) {
  await page.evaluate((data) => {
    for (const [key, value] of Object.entries(data)) {
      localStorage.setItem(key, value)
    }
  }, SEED_DATA)
}

async function dismissModals(page) {
  // Aggressively dismiss all modal overlays and achievement popups
  for (let i = 0; i < 10; i++) {
    // Try pressing Escape first
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)

    // Find any visible overlay/modal
    const overlays = page.locator('[class*="fixed"][class*="inset-0"]')
    const count = await overlays.count()

    let foundModal = false
    for (let j = 0; j < count; j++) {
      const overlay = overlays.nth(j)
      if (await overlay.isVisible().catch(() => false)) {
        foundModal = true
        // Look for X/close buttons
        const xBtn = overlay.locator('button').first()
        if (await xBtn.count() > 0) {
          await xBtn.click({ force: true, timeout: 1000 }).catch(() => {})
          await page.waitForTimeout(300)
        }
      }
    }

    if (!foundModal) break

    // Also try clicking any close/X buttons anywhere on the page
    const closeButtons = page.locator('button[aria-label*="close" i], button[aria-label*="dismiss" i]')
    if (await closeButtons.count() > 0) {
      await closeButtons.first().click({ force: true, timeout: 1000 }).catch(() => {})
      await page.waitForTimeout(300)
    }
  }

  // Final: remove any remaining overlays via JS
  await page.evaluate(() => {
    document.querySelectorAll('[class*="fixed"]').forEach(el => {
      const style = window.getComputedStyle(el)
      if (style.position === 'fixed' && style.zIndex && parseInt(style.zIndex) > 100) {
        el.remove()
      }
    })
  }).catch(() => {})
  await page.waitForTimeout(500)
}

async function takeScreenshot(page, name, waitMs = 1500) {
  await page.waitForTimeout(waitMs)
  const filePath = path.join(outputDir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  console.log(`  Saved: ${name}.png`)
}

async function main() {
  console.log('Launching browser...')
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: DEVICE_SCALE,
    colorScheme: 'dark',
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
  })

  const page = await context.newPage()

  console.log('Loading app and seeding data...')
  await page.goto('http://localhost:5173', { waitUntil: 'networkidle' })
  await seedLocalStorage(page)
  await page.reload({ waitUntil: 'networkidle' })

  // Dismiss any startup modals/onboarding
  await dismissModals(page)
  await page.waitForTimeout(1000)
  await dismissModals(page)

  // Screenshot 1: Dashboard
  console.log('1/5 Dashboard...')
  await takeScreenshot(page, '01-dashboard', 2000)

  // Screenshot 2: Try to navigate to progress view
  await dismissModals(page)
  console.log('2/5 Progress...')
  const progressTab = page.locator('nav button, [role="tab"]').filter({ hasText: /progress/i }).first()
  if (await progressTab.count() > 0) {
    await progressTab.click({ force: true })
  } else {
    const navButtons = page.locator('nav button, footer button, [class*="bottom"] button')
    const count = await navButtons.count()
    if (count >= 3) {
      await navButtons.nth(2).click({ force: true })
    }
  }
  await takeScreenshot(page, '02-progress', 2000)

  // Screenshot 3: Go back to home and start a workout
  console.log('3/5 Workout session...')
  const homeTab = page.locator('nav button, [role="tab"]').filter({ hasText: /home/i }).first()
  if (await homeTab.count() > 0) {
    await homeTab.click({ force: true })
    await page.waitForTimeout(500)
  } else {
    const navButtons = page.locator('nav button, footer button, [class*="bottom"] button')
    if (await navButtons.count() >= 1) {
      await navButtons.nth(0).click({ force: true })
      await page.waitForTimeout(500)
    }
  }
  await dismissModals(page)
  // Try to find and click a workout/start button
  const startBtn = page.locator('button').filter({ hasText: /start|begin|workout|quick/i }).first()
  if (await startBtn.count() > 0) {
    await startBtn.click({ force: true }).catch(() => {})
  }
  await takeScreenshot(page, '03-workout', 2000)

  // Screenshot 4: Exercise library / menu
  console.log('4/5 Menu / Exercise Library...')
  const menuTab = page.locator('nav button, [role="tab"]').filter({ hasText: /menu|more/i }).first()
  await dismissModals(page)
  if (await menuTab.count() > 0) {
    await menuTab.click({ force: true })
  } else {
    const navButtons = page.locator('nav button, footer button, [class*="bottom"] button')
    const count = await navButtons.count()
    if (count >= 4) {
      await navButtons.nth(3).click({ force: true })
    }
  }
  await takeScreenshot(page, '04-menu', 2000)

  // Screenshot 5: Try exercise library from menu
  console.log('5/5 Exercise Library...')
  await dismissModals(page)
  const libraryBtn = page.locator('button, a, [role="button"]').filter({ hasText: /library|exercises|browse/i }).first()
  if (await libraryBtn.count() > 0) {
    await libraryBtn.click({ force: true }).catch(() => {})
  }
  await takeScreenshot(page, '05-library', 2000)

  await browser.close()
  console.log(`\nAll screenshots saved to: ${outputDir}`)
}

main().catch(err => {
  console.error('Screenshot generation failed:', err)
  process.exit(1)
})
