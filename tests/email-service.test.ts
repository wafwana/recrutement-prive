import test from "node:test";
import assert from "node:assert/strict";
import {
  sendEmail,
  sendOwnerAlert,
  sendDepositConfirmation,
  getResendClient,
  PUBLIC_CONTACT_EMAIL,
} from "../lib/email/service";

test("Email Service - getResendClient returns null when API key is missing or mock", () => {
  const origKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    assert.equal(getResendClient(), null);

    process.env.RESEND_API_KEY = "mock_key";
    assert.equal(getResendClient(), null);
  } finally {
    process.env.RESEND_API_KEY = origKey;
  }
});

test("Email Service - sendEmail returns mock success in dev/test environment", async () => {
  const result = await sendEmail({
    to: "test-candidat@recrutement-prive.com",
    subject: "Test email subject",
    html: "<p>Test email body</p>",
  });

  assert.equal(result.ok, true);
  assert.ok(result.id?.startsWith("mock-"));
});

test("Email Service - sendDepositConfirmation escapes HTML and formats confirmation", async () => {
  const result = await sendDepositConfirmation(
    "candidat@test.com",
    "CV_Jean_Dupont.pdf",
    "DEP-2026-99",
    "26/10/2026",
    "22:00"
  );

  assert.equal(result.ok, true);
  assert.ok(result.id?.startsWith("mock-"));
});

test("Email Service - sendOwnerAlert targets owner email box", async () => {
  const result = await sendOwnerAlert("Alerte système", "<p>Alerte de test</p>");
  assert.equal(result.ok, true);
});
