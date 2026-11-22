import { chromium } from "playwright";

const BASE = process.env.SMOKE_WEB_URL || "http://127.0.0.1:43127";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const hostCtx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const guestCtx = await browser.newContext({ viewport: { width: 420, height: 860 } });
  const host = await hostCtx.newPage();
  const guest = await guestCtx.newPage();

  await host.goto(BASE, { waitUntil: "networkidle" });
  await host.getByRole("button", { name: "Host a room" }).click();
  await host.getByLabel("Display name").fill("Ada");
  await host.getByRole("button", { name: "Create room" }).click();
  await host.getByText("Invite code").waitFor();
  const codeText = await host.locator("text=/^[A-Z0-9](?: [A-Z0-9]){3}$/").first().innerText();
  const code = codeText.replace(/\s+/g, "");
  console.log("room", code);

  await guest.goto(`${BASE}/?room=${code}`, { waitUntil: "networkidle" });
  await guest.getByLabel("Display name").fill("Bo");
  if (await guest.getByLabel("Room code").count()) {
    await guest.getByLabel("Room code").fill(code);
  }
  await guest.getByRole("button", { name: "Join room" }).click();
  await guest.getByText("Bo · you").waitFor();
  await host.getByText("Bo").waitFor();

  await host.getByRole("button", { name: "Start game" }).click();
  await host.getByText("Lock in guess").waitFor();
  await guest.getByText("Lock in guess").waitFor();

  await host.getByPlaceholder("Type a number").fill("50");
  await host.getByRole("button", { name: "Lock in guess" }).click();
  await guest.getByPlaceholder("Type a number").fill("80");
  await guest.getByRole("button", { name: "Lock in guess" }).click();

  await host.getByText("Reveal").waitFor();
  await guest.getByText("Reveal").waitFor();
  console.log("BROWSER SMOKE OK");

  await browser.close();
}

main().catch(async (error) => {
  console.error(error);
  process.exit(1);
});
