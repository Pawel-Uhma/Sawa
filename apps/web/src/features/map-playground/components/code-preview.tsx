import { useState } from "react";

const COPIED_MS = 1600;

/** Copyable JSX of the current settings. */
export function CodePreview({ code }: { code: string }) {
  const [isCopied, setIsCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), COPIED_MS);
    } catch {
      // Clipboard blocked (no HTTPS or permission): the code stays selectable.
    }
  }

  return (
    <div className="relative">
      <pre className="max-h-64 overflow-auto rounded-xl bg-tekst p-3.5 pr-20 font-mono text-[12px] leading-relaxed text-mieta-jasna select-text">
        <code>{code}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute top-2 right-2 rounded-lg bg-white/10 px-2.5 py-1 text-xs font-semibold text-white transition-colors hover:bg-white/20"
      >
        {isCopied ? "Skopiowano" : "Kopiuj"}
      </button>
    </div>
  );
}
