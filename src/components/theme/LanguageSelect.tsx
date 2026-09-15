"use client";

import { Languages } from "lucide-react";
import { useUiStore, type AppLanguage } from "@/store/uiStore";

export function LanguageSelect() {
  const language = useUiStore((state) => state.language);
  const setLanguage = useUiStore((state) => state.setLanguage);

  return (
    <label className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-panel px-3 text-xs font-black uppercase tracking-wide text-ink">
      <Languages className="h-4 w-4 text-cyan" aria-hidden="true" />
      <select
        aria-label={language === "ko" ? "언어 선택" : language === "ja" ? "言語選択" : "Language"}
        value={language}
        onChange={(event) => setLanguage(event.target.value as AppLanguage)}
        className="language-select bg-transparent text-ink outline-none"
      >
        <option value="ko">한국어</option>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </label>
  );
}
