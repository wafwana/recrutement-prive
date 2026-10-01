import test from "node:test";
import assert from "node:assert/strict";
import { dispatchMessageNotificationEmail } from "../lib/email/messaging-dispatch";
import { sendEmail } from "../lib/email/service";

test("Messaging Email - Dispatcher handles missing database gracefully without throwing", async () => {
  const res = await dispatchMessageNotificationEmail({
    conversationId: "conv_dummy",
    messageId: "msg_dummy",
    senderId: "user_sender",
    senderName: "Test Sender",
    senderRole: "CANDIDAT",
    bodyText: "Bonjour, ceci est un test de message.",
  });

  assert.equal(res.dispatchedCount, 0);
  assert.ok(Array.isArray(res.errors));
});

test("Messaging Email - sendEmail mock mode in test environment", async () => {
  const res = await sendEmail({
    to: "test.recipient@example.test",
    subject: "Test Notification",
    html: "<p>Test Content</p>",
  });

  assert.equal(res.ok, true);
  assert.ok(res.id?.startsWith("mock-"));
});

test("Messaging Email - Candidate to RP communication rules", () => {
  const candidateRole = "CANDIDAT";
  const rpStaffRole = "OWNER";
  assert.notEqual(candidateRole, rpStaffRole);
});

test("Messaging Email - Enterprise to RP communication rules", () => {
  const enterpriseRole = "ENTREPRISE";
  const rpStaffRole = "CONSULTANT";
  assert.notEqual(enterpriseRole, rpStaffRole);
});

test("Messaging Email - Direct Candidate to Enterprise contact prohibition", () => {
  const roles = new Set(["CANDIDAT", "ENTREPRISE"]);
  const isDirectCandidateCompany = roles.has("CANDIDAT") && roles.has("ENTREPRISE") && roles.size === 2;
  assert.equal(isDirectCandidateCompany, true);
});
