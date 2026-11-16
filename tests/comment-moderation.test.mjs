import test from "node:test";
import assert from "node:assert/strict";
import { moderateComment } from "../src/lib/comment-moderation.ts";

const blocked = [
  ["profanity", "You are a fucking idiot"],
  ["personal attack", "Nobody likes you"],
  ["hate speech", "Your tribe is inferior"],
  ["sexual harassment", "Send me nudes"],
  ["threat", "I will kill you"],
  ["self-harm", "Go kill yourself"],
  ["scam", "Claim your prize"],
  ["phishing", "Send your login details"],
  ["spam", "Follow for follow"],
  ["illegal trade", "Hire a hacker"],
  ["child safety", "Underage sex"],
  ["contact spam", "WhatsApp me"],
  ["harassment", "I will leak your pictures"],
];

for (const [category, phrase] of blocked) {
  test(`blocks representative ${category} content`, () => {
    assert.equal(moderateComment(phrase).allowed, false, phrase);
  });
}

test("blocks punctuation, spacing and common leetspeak evasions", () => {
  for (const phrase of ["f.u.c.k", "f u c k", "sh1t", "b!tch", "g0 k1ll y0urself"]) {
    assert.equal(moderateComment(phrase).allowed, false, phrase);
  }
});

test("does not reject ordinary words containing blocked-word fragments", () => {
  for (const phrase of [
    "Our class project starts tomorrow",
    "I like shiitake mushrooms",
    "The assistant is helping with a book",
    "This is a massive success",
    "I will assess the results",
    "We are discussing the countryside",
  ]) {
    assert.equal(moderateComment(phrase).allowed, true, phrase);
  }
});

test("allows normal respectful conversation and empty input", () => {
  for (const phrase of ["Hello friends, how are you?", "Thank you for sharing.", "I disagree respectfully.", "", "   "]) {
    assert.equal(moderateComment(phrase).allowed, true, phrase);
  }
});
