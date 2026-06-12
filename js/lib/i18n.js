const STORAGE_KEY = "springwave_lang";
const DEFAULT_LANG = "en";

let currentLang = localStorage.getItem(STORAGE_KEY) || DEFAULT_LANG;
let translations = {};
let loaded = false;

export async function initI18n() {
  try {
    const [en, vi] = await Promise.all([
      fetch("/locales/en.json").then(r => r.json()),
      fetch("/locales/vi.json").then(r => r.json()),
    ]);
    translations = { en, vi };
    loaded = true;
  } catch (e) {
    console.error("i18n init error:", e);
  }
  applyTranslation();
  return currentLang;
}

export function t(key, params = {}) {
  const keys = key.split(".");
  let val = translations[currentLang];
  for (const k of keys) {
    val = val?.[k];
  }
  if (val === undefined) {
    val = translations.en;
    for (const k of keys) {
      val = val?.[k];
    }
  }
  if (val === undefined) return key;
  if (typeof val === "string") {
    return val.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] ?? `{{${p}}}`);
  }
  return val;
}

export function getLang() {
  return currentLang;
}

export async function setLang(lang) {
  if (lang === currentLang) return;
  if (!translations[lang]) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  document.documentElement.lang = lang;
  applyTranslation();
  window.dispatchEvent(new CustomEvent("language-changed", { detail: { lang } }));
}

function applyTranslation() {
  document.querySelectorAll("[data-i18n]").forEach(el => {
    const key = el.dataset.i18n;
    const text = t(key);
    if (text !== key) {
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        el.placeholder = text;
      } else if (el.tagName === "TITLE") {
        document.title = text;
      } else {
        el.textContent = text;
      }
    }
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    const text = t(el.dataset.i18nTitle);
    if (text !== el.dataset.i18nTitle) el.title = text;
  });
  document.querySelectorAll("[data-i18n-html]").forEach(el => {
    const text = t(el.dataset.i18nHtml);
    if (text !== el.dataset.i18nHtml) el.innerHTML = text;
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (!loaded) initI18n();
    else applyTranslation();
  });
} else {
  if (!loaded) initI18n();
  else applyTranslation();
}
