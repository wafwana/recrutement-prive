import test from "node:test";
import assert from "node:assert/strict";
import { normalizePhoneNumber, mapIvrChoiceToCategory } from "../lib/telephony/caller-id";
import { buildWhisperAnnouncement, isOffHours, DefaultTelephonyEngine } from "../lib/telephony/engine";
import { verifyTelephonyWebhookSignature } from "../lib/telephony/security";
import { createHmac } from "crypto";
import { canMakeOutboundCalls } from "../lib/telephony/permissions";
import { DEFAULT_TELEPHONY_SETTINGS } from "../lib/telephony/config";

test("Telephony - Phone number normalization", () => {
  assert.equal(normalizePhoneNumber("06 12 34 56 78"), "+33612345678");
  assert.equal(normalizePhoneNumber("+33189000000"), "+33189000000");
  assert.equal(normalizePhoneNumber("01-89-00-00-00"), "+33189000000");
});

test("Telephony - IVR choice mapping to categories", () => {
  assert.equal(mapIvrChoiceToCategory("1"), "ENTERPRISE");
  assert.equal(mapIvrChoiceToCategory("2"), "CANDIDATE");
  assert.equal(mapIvrChoiceToCategory("3"), "PARTNER");
  assert.equal(mapIvrChoiceToCategory("4"), "COLLABORATOR");
  assert.equal(mapIvrChoiceToCategory("5"), "OTHER");
  assert.equal(mapIvrChoiceToCategory("invalid"), "OTHER");
});

test("Telephony - Whisper announcements for recipient", () => {
  assert.equal(buildWhisperAnnouncement("ENTERPRISE"), "Appel Recrutement Privé — Entreprise");
  assert.equal(buildWhisperAnnouncement("CANDIDATE"), "Appel Recrutement Privé — Candidat");
  assert.equal(buildWhisperAnnouncement("PARTNER"), "Appel Recrutement Privé — Partenaire");
  assert.equal(buildWhisperAnnouncement("COLLABORATOR"), "Appel Recrutement Privé — Collaborateur");
  assert.equal(buildWhisperAnnouncement("OTHER"), "Appel Recrutement Privé — Autre demande");
});

test("Telephony - Off-hours detection", () => {
  const settings = { ...DEFAULT_TELEPHONY_SETTINGS };

  // Monday 10:00 AM -> In business hours
  const mondayMorning = new Date("2026-03-30T10:00:00Z"); // 2026-03-30 is Monday
  assert.equal(isOffHours(settings, mondayMorning), false);

  // Sunday 14:00 PM -> Off-hours
  const sundayAfternoon = new Date("2026-03-29T14:00:00Z"); // 2026-03-29 is Sunday
  assert.equal(isOffHours(settings, sundayAfternoon), true);
});

test("Telephony - Outbound call permission rules", async () => {
  // OWNER always allowed
  const ownerAllowed = await canMakeOutboundCalls("owner_user_id", "OWNER");
  assert.equal(ownerAllowed, true);

  // ADMIN / CONSULTANT blocked by default without DB grant
  const adminAllowed = await canMakeOutboundCalls("admin_user_id", "ADMIN");
  assert.equal(adminAllowed, false);

  const consultantAllowed = await canMakeOutboundCalls("consultant_user_id", "CONSULTANT");
  assert.equal(consultantAllowed, false);
});

test("Telephony - Engine inbound routing simulation", async () => {
  const engine = new DefaultTelephonyEngine();

  const res = await engine.processInboundCall({
    callerNumber: "+33699887766",
    ivrChoice: "2",
  });

  assert.ok(res.callLogId);
  assert.equal(res.selectedCategory, "CANDIDATE");
  assert.equal(res.announcementText, "Appel Recrutement Privé — Candidat");
  assert.equal(res.ringMode, "SEQUENTIAL");
});

test("Telephony - Engine outbound call initiation block for unpermitted role", async () => {
  const engine = new DefaultTelephonyEngine();

  const result = await engine.initiateOutboundCall(
    {
      initiatorUserId: "consultant_unauthorized",
      targetPhoneNumber: "+33612345678",
    },
    "CONSULTANT"
  );

  assert.equal(result.ok, false);
  assert.match(result.error || "", /refusé/i);
});

test("Telephony - Engine outbound call allowed for OWNER", async () => {
  const engine = new DefaultTelephonyEngine();

  const result = await engine.initiateOutboundCall(
    {
      initiatorUserId: "owner_user_1",
      targetPhoneNumber: "+33612345678",
    },
    "OWNER"
  );

  assert.equal(result.ok, true);
  assert.ok(result.callLogId);
  assert.equal(result.mode, "SIMULATION");
});

test("Telephony - HMAC-SHA256 Webhook signature validation", () => {
  const secret = "test_webhook_secret_123";
  const payload = JSON.stringify({ callerNumber: "+33612345678", ivrChoice: "1" });
  const validHmac = createHmac("sha256", secret).update(payload).digest("hex");

  // 1. Valid signature
  const validRes = verifyTelephonyWebhookSignature(payload, validHmac, null, secret);
  assert.equal(validRes.valid, true);

  // 2. Invalid signature
  const invalidRes = verifyTelephonyWebhookSignature(payload, "invalid_signature_hash", null, secret);
  assert.equal(invalidRes.valid, false);
  assert.match(invalidRes.reason || "", /invalide/i);

  // 3. Missing signature when secret is configured
  const missingRes = verifyTelephonyWebhookSignature(payload, null, null, secret);
  assert.equal(missingRes.valid, false);
  assert.match(missingRes.reason || "", /manquant/i);
});
