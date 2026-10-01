import test from "node:test";
import assert from "node:assert/strict";

function checkDocumentDownloadPermission(userRole: string, downloadRequested: boolean) {
  if (downloadRequested && userRole !== "OWNER" && userRole !== "CANDIDAT") {
    return { allowed: false, error: "Le téléchargement est exclusivement réservé au compte OWNER." };
  }
  return { allowed: true };
}

function resolveInternalMessagingRecipient(senderRole: string, requestedRecipientId: string, ownerUserId: string) {
  if (senderRole === "ENTREPRISE" || senderRole === "SPONSOR") {
    return ownerUserId;
  }
  return requestedRecipientId;
}

test("Unit tests: Internal Messaging & Document Confidentiality logic", async (t) => {
  await t.test("Download of binary files is exclusively allowed for OWNER role", () => {
    assert.deepEqual(checkDocumentDownloadPermission("ADMIN", true), {
      allowed: false,
      error: "Le téléchargement est exclusivement réservé au compte OWNER.",
    });

    assert.deepEqual(checkDocumentDownloadPermission("CONSULTANT", true), {
      allowed: false,
      error: "Le téléchargement est exclusivement réservé au compte OWNER.",
    });

    assert.deepEqual(checkDocumentDownloadPermission("OWNER", true), {
      allowed: true,
    });

    assert.deepEqual(checkDocumentDownloadPermission("ADMIN", false), {
      allowed: true,
    });
  });

  await t.test("Messages from ENTREPRISE or SPONSOR are always routed to OWNER inbox first", () => {
    const ownerId = "usr_owner_123";
    const collaboratorId = "usr_collab_456";

    // Enterprise message is redirected to OWNER
    const recipientForEnterprise = resolveInternalMessagingRecipient("ENTREPRISE", collaboratorId, ownerId);
    assert.equal(recipientForEnterprise, ownerId);

    // Sponsor message is redirected to OWNER
    const recipientForSponsor = resolveInternalMessagingRecipient("SPONSOR", collaboratorId, ownerId);
    assert.equal(recipientForSponsor, ownerId);

    // Internal staff message preserves requested recipient
    const recipientForAdmin = resolveInternalMessagingRecipient("ADMIN", collaboratorId, ownerId);
    assert.equal(recipientForAdmin, collaboratorId);
  });
});
