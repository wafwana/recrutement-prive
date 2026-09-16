import test from "node:test";
import assert from "node:assert/strict";
import { getAppBaseUrl } from "../lib/url";

test("getAppBaseUrl returns NEXTAUTH_URL when defined", () => {
  const orig = process.env.NEXTAUTH_URL;
  process.env.NEXTAUTH_URL = "https://custom-domain.com";
  try {
    assert.equal(getAppBaseUrl(), "https://custom-domain.com");
  } finally {
    if (orig) process.env.NEXTAUTH_URL = orig;
    else delete process.env.NEXTAUTH_URL;
  }
});

test("getAppBaseUrl defaults to production domain in production environment", () => {
  const origNextAuth = process.env.NEXTAUTH_URL;
  const origAppUrl = process.env.APP_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.APP_URL;

  try {
    const url = getAppBaseUrl();
    assert.equal(typeof url, "string");
    assert.equal(url.startsWith("http"), true);
  } finally {
    if (origNextAuth) process.env.NEXTAUTH_URL = origNextAuth;
    if (origAppUrl) process.env.APP_URL = origAppUrl;
  }
});
