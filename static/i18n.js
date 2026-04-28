const FALLBACK = {
  "app.title": "File Tools",
  "nav.compress_image": "Compress Image",
  "nav.compress_pdf": "Compress PDF",
  "nav.merge_pdf": "Merge PDFs",
  "drop.image.text": "Drag & drop an image here, or click to browse",
  "drop.image.hint": "Supports JPG, PNG, WebP",
  "drop.pdf.text": "Drag & drop a PDF here, or click to browse",
  "drop.pdf.hint": "Supports PDF",
  "drop.merge.text": "Drag & drop PDFs here, or click to browse",
  "drop.merge.hint": "Drop multiple PDFs to merge",
  "control.quality": "Quality: ",
  "button.compress_image": "Compress Image",
  "button.compress_pdf": "Compress PDF",
  "button.merge_pdf": "Merge PDFs",
  "button.download": "Download",
  "button.download_merged": "Download Merged PDF",
  "button.compress_another": "Compress Another",
  "button.merge_more": "Merge More",
  "results.heading": "Results",
  "results.merge_heading": "Merge Complete",
  "stat.original": "Original",
  "stat.compressed": "Compressed",
  "stat.reduction": "Reduction",
  "stat.total_pages": "Total pages",
  "stat.result_size": "Result size",
  "file_list.heading": "Files to Merge",
  "state.compressing": "Compressing...",
  "state.merging": "Merging...",
  "size.byte": "B",
  "size.kilobyte": "KB",
  "size.megabyte": "MB",
  "error.server_error": "Server error {status}",
  "error.network_error": "Network error",
  "error.generic": "Error: {message}",
  "result.files_count": "{n} files",
  "lang.en": "English",
  "lang.zh-CN": "中文 (简体)",
  "lang.zh-TW": "中文 (繁體)",
  "lang.fr": "Français",
  "lang.ko": "한국어",
  "lang.ja": "日本語",
  "lang.hi": "हिन्दी",
};

const i18n = {
  currentLocale: "en",
  bundle: {},

  async init() {
    const locale = this.detectLocale();
    await this.setLocale(locale, true);
  },

  detectLocale() {
    const saved = localStorage.getItem("lang");
    if (saved) return this.normalizeLocale(saved);
    return this.normalizeLocale(navigator.language || "");
  },

  normalizeLocale(lang) {
    if (!lang) return "en";
    if (FALLBACK[`lang.${lang}`]) return lang;
    const base = lang.split("-")[0];
    if (base === "zh") return "zh-CN";
    if (FALLBACK[`lang.${base}`]) return base;
    return "en";
  },

  t(key, params) {
    let val = this.bundle[key] ?? FALLBACK[key] ?? key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        val = val.replace(`{${k}}`, v);
      }
    }
    return val;
  },

  applyToDOM() {
    for (const el of document.querySelectorAll("[data-i18n]")) {
      const key = el.dataset.i18n;
      const val = this.t(key);
      if (el.tagName === "TITLE") {
        document.title = val;
      } else {
        el.textContent = val;
      }
    }
    document.documentElement.lang = this.currentLocale;
  },

  async setLocale(locale, silent) {
    this.currentLocale = locale;
    localStorage.setItem("lang", locale);

    if (locale === "en") {
      this.bundle = {};
    } else {
      try {
        const res = await fetch(`/static/lang/${locale}.json`);
        this.bundle = await res.json();
      } catch {
        this.bundle = {};
      }
    }

    this.applyToDOM();

    const sel = document.getElementById("lang-select");
    if (sel) sel.value = locale;

    if (!silent) {
      document.dispatchEvent(new CustomEvent("i18n-changed", { detail: { locale } }));
    }
  },
};
