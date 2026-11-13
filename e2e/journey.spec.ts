import { expect, test } from "@playwright/test";

// One journey through the site, against the recorded held-out run.
test("inbox to ticket to review, then results and how it works", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Support inbox" })).toBeVisible();

  // MT-2002: a compromised-key report with an instruction hidden in its log.
  await page.getByRole("link", { name: /MT-2002/ }).click();
  await expect(page).toHaveURL(/\/tickets\/MT-2002$/);
  await expect(page.getByRole("heading", { level: 1, name: /Unrecognized API activity/ })).toBeVisible();

  const steps = page.getByRole("list", { name: "What the agent did" });
  await expect(steps.getByText("Left out before the model saw the ticket")).toBeVisible();
  await expect(steps.getByText("R1-SECURITY")).toBeVisible();
  await expect(steps.getByRole("heading", { name: /Bug report for Engineering/ })).toBeVisible();

  // Approve and undo only change local state.
  const status = page.getByRole("status");
  await expect(status).toContainText("Waiting for a person to approve");
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("button", { name: "Approve" })).toHaveAttribute("aria-pressed", "true");
  await expect(status).toContainText("Approved.");
  await page.getByRole("button", { name: "Undo" }).click();
  await expect(status).toContainText("Waiting for a person to approve");

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Results" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Results" })).toBeVisible();
  await expect(page.getByText("Escalation recall").first()).toBeVisible();
  await expect(page.getByRole("table", { name: /Rows are the label/ })).toBeVisible();

  // A miss links back to its ticket.
  const misses = page.getByRole("region", { name: "Every miss" });
  await misses.getByRole("link", { name: /MT-2010/ }).click();
  await expect(page).toHaveURL(/\/tickets\/MT-2010$/);

  await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "How it works" }).click();
  await expect(page.getByRole("heading", { name: "The design rule" })).toBeVisible();
  await expect(page.getByRole("region", { name: "The rules, in order" }).getByText("R1-SECURITY")).toBeVisible();
  await expect(page.getByRole("heading", { name: "What it gets wrong" })).toBeVisible();
});

// Real ticket IDs are prerendered. A made-up ID renders on request: with Partial Prerendering
// the route's static shell is sent first, so the response is 200 with the not-found page and a
// noindex tag (documented Next.js behavior), not an HTTP 404.
test("an unknown ticket ID shows the not-found page and is not indexed", async ({ page }) => {
  await page.goto("/tickets/MT-9999");
  await expect(page.getByRole("heading", { name: "Ticket not found" })).toBeVisible();
  expect(await page.locator('meta[name="robots"][content*="noindex"]').count()).toBeGreaterThan(0);
});

test("ticket pages are fully prerendered, not streamed in after load", async ({ request }) => {
  const html = await (await request.get("/tickets/MT-2002")).text();
  expect(html).toContain("Unrecognized API activity creating admin keys");
  expect(html).toContain("R1-SECURITY");
});

test("TechOps tickets: the tab, and the link TechOps builds", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: /TechOps/ }).click();
  const list = page.getByRole("list", { name: "TechOps tickets" });
  await expect(list.getByRole("listitem")).toHaveCount(29);

  // TechOps links to /techops/<scenario>/<n>; it lands on the right ticket.
  await page.goto("/techops/dns-failure/3");
  await expect(page).toHaveURL(/\/tickets\/MT-3003$/);
  await expect(page.getByRole("heading", { level: 1, name: "API requests timing out from our integration" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "From TechOps Command Center" })).toBeVisible();
  await expect(page.getByText(/Not scored: TechOps tickets have no answer key/)).toBeVisible();
});
