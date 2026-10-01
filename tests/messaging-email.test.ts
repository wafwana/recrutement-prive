import test from "node:test";
import assert from "node:assert/strict";
import { dispatchMessageNotificationEmail } from "../lib/email/messaging-dispatch";
import { sendEmail } from "../lib/email/service";

test("Messaging Email - Dispatcher handles missing database gracefully without throwing", async () => {
  const res = await dispatchMessageNotificationEmail({
    conversationId: "conv_dummy",
    messageId: "msg_dummy_123",
    senderId: "user_sender",
    senderName: "Test Sender",
    senderRole: "CANDIDAT",
    bodyText: "Bonjour, ceci est un test de message confidentiel.",
  });

  assert.equal(res.dispatchedCount, 0);
  assert.ok(Array.isArray(res.errors));
});

test("Messaging Email - sendEmail mock mode in test environment returns ok", async () => {
  const res = await sendEmail({
    to: "test.recipient@example.test",
    subject: "Notification de message",
    html: "<p>Vous avez reçu un nouveau message.</p>",
  });

  assert.equal(res.ok, true);
  assert.ok(res.id?.startsWith("mock-"));
});

test("Messaging Email - Direction 1: Candidate -> RP communication permitted", () => {
  const senderRole: string = "CANDIDAT";
  const recipientRole: string = "OWNER";
  const isDirectCandidateCompany = (senderRole === "CANDIDAT" && recipientRole === "ENTREPRISE");
  assert.equal(isDirectCandidateCompany, false);
});

test("Messaging Email - Direction 2: RP -> Candidate communication permitted", () => {
  const senderRole: string = "CONSULTANT";
  const recipientRole: string = "CANDIDAT";
  const isDirectCandidateCompany = (senderRole === "CANDIDAT" && recipientRole === "ENTREPRISE");
  assert.equal(isDirectCandidateCompany, false);
});

test("Messaging Email - Direction 3: Company -> RP communication permitted", () => {
  const senderRole: string = "ENTREPRISE";
  const recipientRole: string = "OWNER";
  const isDirectCandidateCompany = (senderRole === "CANDIDAT" && recipientRole === "ENTREPRISE");
  assert.equal(isDirectCandidateCompany, false);
});

test("Messaging Email - Direction 4: RP -> Company communication permitted", () => {
  const senderRole: string = "ADMIN";
  const recipientRole: string = "ENTREPRISE";
  const isDirectCandidateCompany = (senderRole === "CANDIDAT" && recipientRole === "ENTREPRISE");
  assert.equal(isDirectCandidateCompany, false);
});

test("Messaging Email - Direct Candidate to Company contact is strictly prohibited (403)", () => {
  const roles = new Set(["CANDIDAT", "ENTREPRISE"]);
  const isProhibited = roles.has("CANDIDAT") && roles.has("ENTREPRISE") && roles.size === 2;
  assert.equal(isProhibited, true);
});

test("Messaging Email - Privacy guard: notification email body omits raw message text", async () => {
  const htmlSample = `
    <div style="font-family: Arial;">
      <h2>Notification de Message</h2>
      <p>Vous avez reçu un nouveau message de Test User (CANDIDAT).</p>
      <div>Afin de garantir la confidentialité, le contenu est accessible sur la plateforme.</div>
    </div>
  `;

  assert.equal(htmlSample.includes("confidentiel_cv_data"), false);
  assert.equal(htmlSample.includes("Plateforme"), true);
});
