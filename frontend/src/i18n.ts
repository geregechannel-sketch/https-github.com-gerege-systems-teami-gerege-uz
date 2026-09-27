// UI language. Mongolian is the default; the screens are written in Russian
// (1:1 with TEAMI), so for "mn" we translate rendered text in place from a
// ru→mn dictionary. This also covers labels that come from the API/database.
// ponytail: DOM-level translation, not per-component t(); move to t() calls if
// a screen ever needs grammar-aware plurals or interpolation.
import MN from "./i18n.mn.json";

export type Lang = "mn" | "ru" | "en" | "uz";
// New key so every browser starts in Mongolian (the old "lang" key was always "ru").
const KEY = "ui_lang";

export function getLang(): Lang {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "mn" || v === "ru" || v === "en" || v === "uz") return v;
  } catch {}
  return "mn";
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  document.documentElement.lang = lang;
}

const DICT: Record<string, string> = MN;
// Same edge characters the dictionary extractor strips; only the core is looked up.
const EDGE = /^([\s:·,.—–\-()«»"'…*›‹/%#№+]*)([\s\S]*?)([\s:·,.—–\-()«»"'…*›‹/%#№+]*)$/;
const CYR = /[А-Яа-яЁё]/;

function core(s: string): string {
  const m = EDGE.exec(s)!;
  const hit = DICT[m[2]];
  return hit === undefined ? s : m[1] + hit + m[3];
}

export function translate(s: string): string {
  if (!CYR.test(s)) return s;
  const whole = core(s);
  if (whole !== s) return whole;
  // "Задание #12 создано", "5 с": translate the text around the numbers.
  return s.split(/(\d+(?:[.,:]\d+)*)/).map((p, i) => (i % 2 ? p : core(p))).join("");
}

const ATTRS = ["placeholder", "title", "aria-label"];
const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT"]);

function fixText(n: Text) {
  const p = n.parentElement;
  if (!p || SKIP.has(p.tagName) || p.isContentEditable) return;
  const v = n.nodeValue || "";
  const t = translate(v);
  if (t !== v) n.nodeValue = t;
}

function fixEl(el: Element) {
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (v) {
      const t = translate(v);
      if (t !== v) el.setAttribute(a, t);
    }
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return fixText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  fixEl(root as Element);
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = w.nextNode(); n; n = w.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) fixText(n as Text);
    else fixEl(n as Element);
  }
}

export function startTranslator() {
  document.documentElement.lang = getLang();
  const active = () => getLang() === "mn";
  const alert0 = window.alert.bind(window);
  const confirm0 = window.confirm.bind(window);
  window.alert = (m?: any) => alert0(active() ? translate(String(m ?? "")) : m);
  window.confirm = (m?: string) => confirm0(active() ? translate(String(m ?? "")) : m);

  new MutationObserver((muts) => {
    if (!active()) return;
    for (const m of muts) {
      if (m.type === "characterData") fixText(m.target as Text);
      else if (m.type === "attributes") fixEl(m.target as Element);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, {
    subtree: true, childList: true, characterData: true,
    attributes: true, attributeFilter: ATTRS,
  });
  if (active()) walk(document.body);
}
