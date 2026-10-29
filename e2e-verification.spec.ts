import { test, expect } from '@playwright/test';

const THEMES = [
  'FORK', 'PIN', 'SKEWER', 'HANGING_PIECE',
  'BACK_RANK', 'LATE_CASTLING', 'CENTER_CONTROL', 'OPEN_FILE'
];

// Helper: log in via the login page, then navigate to a fresh app state
async function loginAndNavigate(page: any, targetUrl: string) {
  // Step 1: Go to login page and submit credentials
  await page.goto('http://localhost:5173/#/login');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  const loginForm = page.locator('form#login-form');
  if (await loginForm.count() > 0) {
    await page.locator('input[type="email"]').fill('dev@chesscoach.local');
    await page.locator('input[type="password"]').fill('test123');
    await loginForm.locator('button[type="submit"]').click();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);
  }

  // Step 2: Navigate to the target URL (fresh app mount with session cookie)
  await page.goto(targetUrl);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(5000);
}

test.describe('Chess Mastery E2E Verification', () => {
  test('A. Application loads and basic routing works', async ({ page }) => {
    await loginAndNavigate(page, 'http://localhost:5173');

    await expect(page).toHaveTitle(/Chess Coach/);

    const navButtons = page.locator('aside nav button');
    await expect(navButtons.first()).toBeVisible({ timeout: 10000 });
  });

  test('B. Play page loads and chessboard renders', async ({ page }) => {
    await loginAndNavigate(page, 'http://localhost:5173#/play');

    const board = page.locator('.grid.grid-cols-8.grid-rows-8').first();
    await expect(board).toBeVisible({ timeout: 15000 });
  });

  test('C. Coach panel is present on Play page', async ({ page }) => {
    await loginAndNavigate(page, 'http://localhost:5173#/play');

    const coachHeader = page.locator('text=AI Chess Coach').first();
    await expect(coachHeader).toBeVisible({ timeout: 15000 });
  });

  test('D. All 8 themes navigate correctly from practice page', async ({ page }) => {
    // Increase timeout for this test since it loops over 8 themes
    test.setTimeout(120000);
    
    for (const theme of THEMES) {
      await loginAndNavigate(page, `http://localhost:5173#/practice?theme=${theme}`);

      const themeBadge = page.locator(`text=${theme.replace('_', ' ')}`).first();
      await expect(themeBadge).toBeVisible({ timeout: 15000 });
    }
  });

  test('E. Invalid theme handling', async ({ page }) => {
    await loginAndNavigate(page, 'http://localhost:5173#/practice?theme=INVALID_THEME');

    const dashboard = page.locator('text=Personalized Tactical Training').first();
    await expect(dashboard).toBeVisible({ timeout: 15000 });

    await loginAndNavigate(page, 'http://localhost:5173#/practice');

    const dashboard2 = page.locator('text=Personalized Tactical Training').first();
    await expect(dashboard2).toBeVisible({ timeout: 15000 });
  });

  test('F. Practice session with FORK theme shows theme and session UI', async ({ page }) => {
    await loginAndNavigate(page, 'http://localhost:5173#/practice?theme=FORK');

    // Check theme is displayed
    const themeText = page.locator('text=FORK').first();
    await expect(themeText).toBeVisible({ timeout: 15000 });

    // Check for session-related UI elements
    const sessionInfo = page.locator('text=/Target Theme|Session Progress|Puzzle/i').first();
    await expect(sessionInfo).toBeVisible({ timeout: 15000 });
  });

  test('G. Coach panel interaction on Play page', async ({ page }) => {
    await loginAndNavigate(page, 'http://localhost:5173#/play');

    const coachHeader = page.locator('text=AI Chess Coach').first();
    await expect(coachHeader).toBeVisible({ timeout: 15000 });

    // Play page initial state shows "New Game Options" before a game starts
    const initialState = page.locator('text=/New Game Options|Ready to assist/i').first();
    await expect(initialState).toBeVisible({ timeout: 15000 });
  });

  test('H. Responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndNavigate(page, 'http://localhost:5173#/play');

    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);

    const board = page.locator('.grid.grid-cols-8.grid-rows-8').first();
    await expect(board).toBeVisible({ timeout: 15000 });
  });

  test('I. Responsive design - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAndNavigate(page, 'http://localhost:5173#/practice?theme=PIN');

    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(768);
  });

  test('J. Responsive design - desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAndNavigate(page, 'http://localhost:5173#/analyze');

    const body = page.locator('body');
    const scrollWidth = await body.evaluate(el => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1440);
  });
});