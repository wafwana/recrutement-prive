import test from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/owner/init/route";

test("POST /api/owner/init returns 503 if OWNER_INIT_SECRET is not configured", async () => {
  const originalSecret = process.env.OWNER_INIT_SECRET;
  delete process.env.OWNER_INIT_SECRET;

  try {
    const req = new Request("http://localhost/api/owner/init", {
      method: "POST",
      body: JSON.stringify({ secret: "some-secret" }),
    });

    const res = await POST(req);
    assert.equal(res.status, 503);
    const json = await res.json();
    assert.match(json.error, /OWNER_INIT_SECRET/);
  } finally {
    if (originalSecret) process.env.OWNER_INIT_SECRET = originalSecret;
  }
});

test("POST /api/owner/init returns 401 if provided secret does not match", async () => {
  const originalSecret = process.env.OWNER_INIT_SECRET;
  process.env.OWNER_INIT_SECRET = "super-secret-token";

  try {
    const req = new Request("http://localhost/api/owner/init", {
      method: "POST",
      body: JSON.stringify({ secret: "wrong-token" }),
    });

    const res = await POST(req);
    assert.equal(res.status, 401);
    const json = await res.json();
    assert.match(json.error, /invalide ou non fourni/);
  } finally {
    if (originalSecret) process.env.OWNER_INIT_SECRET = originalSecret;
    else delete process.env.OWNER_INIT_SECRET;
  }
});

test("POST /api/owner/init rejects weak passwords according to password policy", async () => {
  const originalSecret = process.env.OWNER_INIT_SECRET;
  process.env.OWNER_INIT_SECRET = "super-secret-token";

  try {
    const req = new Request("http://localhost/api/owner/init", {
      method: "POST",
      headers: { Authorization: "Bearer super-secret-token" },
      body: JSON.stringify({
        email: "owner@recrutement-prive.com",
        password: "weak",
      }),
    });

    const res = await POST(req);
    assert.equal(res.status, 400);
    const json = await res.json();
    assert.match(json.error, /Mot de passe invalide/);
  } finally {
    if (originalSecret) process.env.OWNER_INIT_SECRET = originalSecret;
    else delete process.env.OWNER_INIT_SECRET;
  }
});
