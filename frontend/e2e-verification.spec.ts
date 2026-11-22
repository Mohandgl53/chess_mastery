import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.E2E_FRONTEND_URL || 'http://localhost:5173';
const API_BASE = process.env.E2E_API_URL || 'http://localhost:5000/api';
const E2E_PASSWORD = 'QaTest123!';
let cachedCredentials: { email: string; password: string } | null = null;

const THEMES = [
  'FORK', 'PIN', 'SKEWER', 'HANGING_PIECE',
  'BACK_RANK', 'LATE_CASTLING', 'CENTER_CONTROL', 'OPEN_FILE'
];

/**
 * Playwright must use a genuinely verified account: the seeded dev user has
 * emailVerified=false and REQUIRE_EMAIL_VERIFICATION=true blocks its login.
 * In development the API returns a one-time verification token we can redeem.
 */
async function createVerifiedE2EUser() {
  if (cachedCredentials) return cachedCredentials;

  const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.test`;
  const headers = { 'Content-Type': 'application/json', Origin: FRONTEND_URL };

  const registerResponse = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, password: E2E_PASSWORD, displayName: 'E2E Verification' })
  });
  const registered = await registerResponse.json();
  if (!registerResponse.ok) {
    throw new Error(`E2E registration failed: ${JSON.stringify(registered)}`);
  }

  const token = registered.devVerificationToken;
  if (!token) {
    throw new Error('E2E registration did not return a verification token; check NODE_ENV on the API.');
  }

  const verifyResponse = await fetch(`${API_BASE}/auth/verify-email`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ token })
  });
  if (!verifyResponse.ok) {
    throw new Error(`E2E verification failed: ${JSON.stringify(await verifyResponse.json())}`);
  }

  cachedCredentials = { email, password: E2E_PASSWORD };
  return cachedCredentials;
}

async function startMatchIfNeeded(page: any) {
  // The lobby contains a board preview with the same grid classes, so the
  // Start Match button — not the board — is the reliable lobby indicator.
  const startButton = page.getByRole('button', { name: /Start Match/i }).first();
  if (await startButton.isVisible().catch(() => false)) {
    await startButton.click();
  }

  await expect(page.locator('.grid.grid-cols-8.grid-rows-8').first()).toBeVisible({ timeout: 15000 });
  await expect(page.getByText(/Bot Match Setup/i).first()).toHaveCount(0, { timeout: 15000 });
}

// Helper: create/verify a fresh account, log in through the UI, then navigate.
async function loginAndNavigate(page: any, targetUrl: string) {
  const credentials = await createVerifiedE2EUser();

  await page.goto(`${FRONTEND_URL}/#/login`);
  await page.locator('input[type="email"]:visible').first().fill(credentials.email);
  await page.locator('input[type="password"]:visible').first().fill(credentials.password);
  await page.locator('button[type="submit"]:visible').first().click();
  await page.waitForFunction(() => !window.location.hash.includes('/login'), null, { timeout: 15000 });

  await page.goto(targetUrl);
  await page.waitForTimeout(1000);
}

test.describe('Chess Mastery E2E Verification', () => {
  test('A. Application loads and basic routing works', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/`);

    await expect(page).toHaveTitle(/Zugora/);
    await expect(page.locator('nav button').first()).toBeVisible({ timeout: 10000 });
  });

  test('B. Play page loads and chessboard renders', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/play`);
    await startMatchIfNeeded(page);
  });

  test('C. Coach panel is present on Play page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/play`);
    await startMatchIfNeeded(page);

    await expect(page.getByRole('heading', { name: 'AI Chess Coach' })).toBeVisible({ timeout: 15000 });
    await expect(page.getByRole('textbox', { name: 'Ask the coach a question' })).toBeVisible({ timeout: 15000 });
  });

  test('D. All 8 themes navigate correctly from practice page', async ({ page }) => {
    test.setTimeout(120000);

    for (const theme of THEMES) {
      await loginAndNavigate(page, `${FRONTEND_URL}/#/practice?theme=${theme}`);
      const themeBadge = page.locator(`text=${theme}`).or(page.locator(`text=${theme.replace('_', ' ')}`)).first();
      await expect(themeBadge).toBeVisible({ timeout: 15000 });
    }
  });

  test('E. Invalid theme handling', async ({ page }) => {
    await loginAndNavigate(page, `${FRONTEND_URL}/#/practice?theme=INVALID_THEME`);
    await expect(page.getByText('Personalized Tactical Training').first()).toBeVisible({ timeout: 15000 });

    await loginAndNavigate(page, `${FRONTEND_URL}/#/practice`);
    await expect(page.getByText('Personalized Tactical Training').first()).toBeVisible({ timeout: 15000 });
  });

  test('F. Practice session with FORK theme shows theme and session UI', async ({ page }) => {
    await loginAndNavigate(page, `${FRONTEND_URL}/#/practice?theme=FORK`);

    await expect(page.locator('text=FORK').first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=/Target Theme|Session Progress|Puzzle/i').first()).toBeVisible({ timeout: 15000 });
  });

  test('G. Coach panel interaction on Play page', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/play`);
    await startMatchIfNeeded(page);

    const coachInput = page.getByRole('textbox', { name: 'Ask the coach a question' });
    await expect(coachInput).toBeVisible({ timeout: 15000 });
    await coachInput.fill('What is the plan in this position?');
    await coachInput.press('Enter');
    await expect(coachInput).toHaveValue('');
    await expect(page.getByText(/Local Coach|Grandmaster Coach|Quick Guidance/i).first()).toBeVisible({ timeout: 15000 });
  });

  test('H. Responsive design - mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/play`);
    await startMatchIfNeeded(page);

    const scrollWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(375);
  });

  test('I. Responsive design - tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/practice?theme=PIN`);

    const scrollWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(768);
  });

  test('J. Responsive design - desktop viewport', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAndNavigate(page, `${FRONTEND_URL}/#/analyze`);

    const scrollWidth = await page.locator('body').evaluate(el => el.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(1440);
  });
});
