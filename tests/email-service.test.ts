import test from "node:test";
import assert from "node:assert/strict";
import {
  sendEmail,
  sendOwnerAlert,
  sendDepositConfirmation,
  getResendClient,
} from "../lib/email/service";

function restoreEnv(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

test("Email Service - getResendClient returns null when API key is missing or mock", () => {
  const origKey = process.env.RESEND_API_KEY;
  try {
    delete process.env.RESEND_API_KEY;
    assert.equal(getResendClient(), null);

    process.env.RESEND_API_KEY = "mock_key";
    assert.equal(getResendClient(), null);
  } finally {
    restoreEnv("RESEND_API_KEY", origKey);
  }
});

test("Email Service - no-key non-production result is explicitly simulated", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "test";

    const result = await sendEmail({
      to: "test-candidat@recrutement-prive.com",
      subject: "Test email subject",
      html: "<p>Test email body</p>",
    });

    assert.equal(result.ok, true);
    assert.equal(result.simulated, true);
    assert.ok(result.id?.startsWith("mock-"));
  } finally {
    restoreEnv("RESEND_API_KEY", origKey);
    restoreEnv("NODE_ENV", origNodeEnv);
  }
});

test("Email Service - missing key fails explicitly in production", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "production";

    const result = await sendEmail({
      to: "test-candidat@recrutement-prive.com",
      subject: "Production configuration test",
      html: "<p>No email should be sent by this test</p>",
    });

    assert.equal(result.ok, false);
    assert.equal(result.simulated, undefined);
    assert.equal(result.error, "Service email non configuré.");
  } finally {
    restoreEnv("RESEND_API_KEY", origKey);
    restoreEnv("NODE_ENV", origNodeEnv);
  }
});

test("Email Service - sendDepositConfirmation marks mock delivery as simulated", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "test";

    const result = await sendDepositConfirmation(
      "candidat@test.com",
      "CV_Jean_Dupont.pdf",
      "DEP-2026-99",
      "26/10/2026",
      "22:00"
    );

    assert.equal(result.ok, true);
    assert.equal(result.simulated, true);
    assert.ok(result.id?.startsWith("mock-"));
  } finally {
    restoreEnv("RESEND_API_KEY", origKey);
    restoreEnv("NODE_ENV", origNodeEnv);
  }
});

test("Email Service - sendOwnerAlert targets owner email box and exposes simulation", async () => {
  const origKey = process.env.RESEND_API_KEY;
  const origNodeEnv = process.env.NODE_ENV;
  try {
    delete process.env.RESEND_API_KEY;
    process.env.NODE_ENV = "test";

    const result = await sendOwnerAlert("Alerte système", "<p>Alerte de test</p>");
    assert.equal(result.ok, true);
    assert.equal(result.simulated, true);
  } finally {
    restoreEnv("RESEND_API_KEY", origKey);
    restoreEnv("NODE_ENV", origNodeEnv);
  }
});
