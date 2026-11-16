import test from "node:test";
import assert from "node:assert/strict";
import {
  getSafeAuthNext,
  readAuthRedirectTokens,
  getAuthFailureMessage,
} from "../src/lib/supabase/auth-flow.ts";

test("accepts safe internal destinations", () => {
  assert.equal(getSafeAuthNext("/home"), "/home");
  assert.equal(getSafeAuthNext("/home/groups?tab=mine"), "/home/groups?tab=mine");
  assert.equal(getSafeAuthNext("/home#latest"), "/home#latest");
});

test("rejects external, protocol-relative and malformed destinations", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example/path",
    "/\\\\evil.example",
    "javascript:alert(1)",
    "",
    null,
    undefined,
  ]) {
    assert.equal(getSafeAuthNext(value), "/home", String(value));
  }
});

test("reads implicit-flow tokens and decoded provider errors from URL fragments", () => {
  assert.deepEqual(
    readAuthRedirectTokens("#access_token=access%2Btoken&refresh_token=refresh-token"),
    {
      accessToken: "access+token",
      refreshToken: "refresh-token",
      errorDescription: null,
    },
  );
  assert.equal(
    readAuthRedirectTokens("#error_description=Email+link+expired").errorDescription,
    "Email link expired",
  );
});

test("does not throw when a provider error contains encoded punctuation", () => {
  assert.equal(
    readAuthRedirectTokens("#error_description=Invalid%25token").errorDescription,
    "Invalid%token",
  );
});

test("uses safe fallback text when an auth error has no message", () => {
  assert.equal(getAuthFailureMessage(null, "Please sign in"), "Please sign in");
  assert.equal(getAuthFailureMessage({ message: "Session expired" }, "Please sign in"), "Session expired");
});
