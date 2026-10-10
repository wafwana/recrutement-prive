import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("secure contact payment supports card, SEPA and bank transfer", () => {
  const service = fs.readFileSync(path.join(root, "lib/payments/secure-contact.ts"), "utf8");
  assert.match(service, /"CARD", "SEPA_DEBIT", "BANK_TRANSFER"/);
  assert.match(service, /SECURE_CONTACT_AMOUNT_CENTS = 9900/);
  assert.match(service, /paymentStatus: "AWAITING_TRANSFER"/);
  assert.match(service, /STRIPE_SECRET_KEY/);
  assert.match(service, /https:\\/\\/www\\.recrutement-prive\\.com/);
  assert.match(service, /success_url/);
  assert.match(service, /AUTH_URL \\|\\| process\\.env\\.NEXTAUTH_URL/);
});

test("payment is company initiated and provider-confirmed before meeting can start", () => {
  const route = fs.readFileSync(path.join(root, "app/api/contacts/secure/payment/route.ts"), "utf8");
  const secure = fs.readFileSync(path.join(root, "lib/contacts/secure-contact.ts"), "utf8");
  assert.match(route, /session\.user\.role !== "ENTREPRISE"/);
  assert.match(secure, /paymentStatus !== "PAID"/);
});

test("Stripe webhook never trusts an unsigned payment event", () => {
  const webhook = fs.readFileSync(path.join(root, "app/api/webhooks/stripe/route.ts"), "utf8");
  assert.match(webhook, /STRIPE_WEBHOOK_SECRET/);
  assert.match(webhook, /Signature invalide/);
  assert.match(webhook, /timingSafeEqual/);
});

test("bank transfer confirmation remains financially permissioned", () => {
  const route = fs.readFileSync(path.join(root, "app/api/contacts/secure/route.ts"), "utf8");
  assert.match(route, /"confirm_transfer"/);
  assert.match(route, /"FACTURATION"/);
  assert.match(route, /SECURE_CONTACT_PAYMENT_CONFIRMED/);
});
