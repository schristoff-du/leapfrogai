import { test as setup } from './fixtures';
import * as OTPAuth from 'otpauth';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  await page.goto('http://localhost:4173');
  if (process.env.PUBLIC_DISABLE_KEYCLOAK === 'true') {
    // uses local supabase test users, logs in directly with Supabase, no Keycloak
    await page.getByText('Already have an account? Sign In').click();
    await page.getByPlaceholder('Your email address').click();
    await page.getByPlaceholder('Your email address').fill('user1@test.com');
    await page.getByPlaceholder('Your password').click();
    await page.getByPlaceholder('Your password').fill('password123');
    await page.getByRole('button', { name: 'Sign In' }).click();
  } else {
    // With Keycloak
    await page.getByRole('button', { name: 'Log In' }).click();
    await page.getByLabel('Username or email').fill(process.env.USERNAME!);
    await page.getByLabel('Password').click();
    await page.getByLabel('Password').fill(process.env.PASSWORD!);
    await page.getByRole('button', { name: 'Log In' }).click();

    const totp = new OTPAuth.TOTP({
      issuer: 'Unicorn Delivery Service',
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: process.env.MFA_SECRET!
    });
    const code = totp.generate();
    await page.getByLabel('Six digit code').fill(code);
    await page.getByRole('button', { name: 'Log In' }).click();
  }

  // Wait until the page receives the cookies.
  //
  // Login flow sets cookies in the process of several redirects.
  // Wait for the final URL to ensure that the cookies are actually set.
  await page.waitForURL('http://localhost:4173/chat');

  // Alternatively, you can wait until the page reaches a state where all cookies are set.
  //   await expect(page.getByRole('button', { name: 'View profile and more' })).toBeVisible();

  // End of authentication steps.

  await page.context().storageState({ path: authFile });
});
