import type { FormEvent } from "react";

/** English-letters-only text for names and addresses: keeps printable ASCII (letters, digits, space and the usual punctuation) and drops everything else
 *  (Urdu and other scripts, emoji, hidden characters), plus a leading space and doubled spaces. Used on the checkout boxes so such characters never appear, typed or pasted. */
export const latinOnly = (v: string): string => v.replace(/[^\x20-\x7E]/g, "").replace(/^ +/, "").replace(/ {2,}/g, " ");

/** onBeforeInput handler: refuses typed or inserted text that has no English character at all (Urdu keys); mixed text is cleaned by latinOnly afterwards. */
export const noNonLatin = (e: FormEvent<HTMLInputElement>) => {
  const data = (e.nativeEvent as InputEvent).data;
  if (data && /[^\x20-\x7E]/.test(data) && latinOnly(data) === "") e.preventDefault();
};

/** For boxes React does not control (it reads the value from the form): after any change, strip what is not allowed and keep the cursor where it was. */
export const stripToLatin = (e: FormEvent<HTMLInputElement>) => {
  const el = e.currentTarget;
  const clean = latinOnly(el.value);
  if (clean === el.value) return;
  const at = el.selectionStart ?? clean.length;
  const removed = el.value.length - clean.length;
  el.value = clean;
  const pos = Math.max(0, at - removed);
  el.setSelectionRange(pos, pos);
};

/** Both handlers in one object, for uncontrolled boxes: <input {...latinInput} />. */
export const latinInput = { onBeforeInput: noNonLatin, onInput: stripToLatin };
