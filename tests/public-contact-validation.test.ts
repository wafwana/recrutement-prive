import assert from "node:assert/strict";
import test from "node:test";
import { validateContactFields } from "../lib/contact/validation";

const valid = {
  name: " Emery ",
  email: " emery@example.com ",
  phone: " 0600000000 ",
  subject: " Demande ",
  message: " Bonjour ",
};

test("contact fields are trimmed before delivery", () => {
  const result = validateContactFields(valid);
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.data.name, "Emery");
    assert.equal(result.data.email, "emery@example.com");
    assert.equal(result.data.message, "Bonjour");
  }
});

test("contact validation rejects missing required fields and invalid email", () => {
  assert.equal(validateContactFields({ ...valid, subject: " " }).ok, false);
  assert.equal(validateContactFields({ ...valid, email: "not-an-email" }).ok, false);
});

test("contact validation enforces field-specific length limits", () => {
  assert.equal(validateContactFields({ ...valid, name: "n".repeat(121) }).ok, false);
  assert.equal(validateContactFields({ ...valid, email: `${"a".repeat(246)}@test.com` }).ok, false);
  assert.equal(validateContactFields({ ...valid, phone: "1".repeat(41) }).ok, false);
  assert.equal(validateContactFields({ ...valid, subject: "s".repeat(161) }).ok, false);
  assert.equal(validateContactFields({ ...valid, message: "m".repeat(5_001) }).ok, false);
});

test("phone remains optional", () => {
  assert.equal(validateContactFields({ ...valid, phone: "" }).ok, true);
});

test("POST /api/contact enforces 32KB payload limit with or without Content-Length", async () => {
  const { POST } = await import("../app/api/contact/route");

  // 1. Avec Content-Length dépassant 32KB
  const oversizedData = new FormData();
  oversizedData.set("name", "Test");
  oversizedData.set("email", "test@example.com");
  oversizedData.set("subject", "Test");
  oversizedData.set("message", "a".repeat(40 * 1024));

  const reqWithHeader = new Request("http://localhost:3000/api/contact", {
    method: "POST",
    headers: {
      "content-length": String(40 * 1024),
    },
    body: oversizedData,
  });

  const resWithHeader = await POST(reqWithHeader);
  assert.equal(resWithHeader.status, 413);
  const jsonWithHeader = await resWithHeader.json();
  assert.equal(jsonWithHeader.error, "Le message est trop volumineux.");

  // 2. Sans Content-Length mais avec corps de requête dépassant 32KB
  const rawOversizedBody = new Blob(["a".repeat(35 * 1024)], { type: "multipart/form-data" });
  const reqWithoutHeader = new Request("http://localhost:3000/api/contact", {
    method: "POST",
    body: rawOversizedBody,
  });

  const resWithoutHeader = await POST(reqWithoutHeader);
  assert.equal(resWithoutHeader.status, 413);
  const jsonWithoutHeader = await resWithoutHeader.json();
  assert.equal(jsonWithoutHeader.error, "Le message est trop volumineux.");
});
