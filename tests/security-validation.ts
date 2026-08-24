import assert from "node:assert/strict";
import { validateUploadedDocument } from "../lib/security/file-validation";
import { rateLimit } from "../lib/security/rate-limit";

const pdf = new File([Buffer.from("%PDF-1.7\n")], "cv.pdf", { type: "application/pdf" });
const fakePdf = new File([Buffer.from("not-a-pdf")], "cv.pdf", { type: "application/pdf" });
const doc = new File([Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])], "cv.doc", { type: "application/msword" });

assert.equal((await validateUploadedDocument(pdf)).ok, true);
assert.equal((await validateUploadedDocument(fakePdf)).ok, false);
assert.equal((await validateUploadedDocument(doc)).ok, true);

const key = `security-test-${Date.now()}`;
assert.equal(rateLimit(key, 2, 60_000).allowed, true);
assert.equal(rateLimit(key, 2, 60_000).allowed, true);
assert.equal(rateLimit(key, 2, 60_000).allowed, false);

console.log("Security validation checks passed.");
