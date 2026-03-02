"use client";

import { getTagStyle } from "@/lib/constants";

export function TagBadge({ tag }: { tag: string }) {
  const style = getTagStyle(tag);
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
      style={{ fontFamily: "'DM Sans', sans-serif", fontSize: "0.62rem", fontWeight: 500 }}
    >
      {tag}
    </span>
  );
}
