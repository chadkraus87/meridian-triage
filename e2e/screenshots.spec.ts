import { test } from "@playwright/test";

// Real screenshots of the running app for the README. Opt-in: SCREENSHOTS=1 npx playwright test screenshots
test.skip(!process.env.SCREENSHOTS, "Set SCREENSHOTS=1 to refresh docs/screenshots");

const shots = [
  ["inbox", "/"],
  ["ticket-escalation", "/tickets/MT-2002"],
  ["ticket-needs-info", "/tickets/MT-2017"],
  ["results", "/results"],
  ["how-it-works", "/how-it-works"],
] as const;

for (const [name, url] of shots) {
  test(`screenshot ${name}`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto(url);
    await page.screenshot({ path: `docs/screenshots/${name}.png`, fullPage: name !== "inbox" });
  });
}
