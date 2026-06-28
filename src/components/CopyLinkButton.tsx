"use client";

import { useState } from "react";

type Props = {
  text: string;
  label?: string;
};

export function CopyLinkButton({ text, label = "Copy link" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
