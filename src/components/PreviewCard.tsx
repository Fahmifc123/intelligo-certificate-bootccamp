"use client";

import { useEffect, useRef, useState } from "react";

export type PreviewKind = "certificate" | "performance" | "invoice";

const CONTENT_PX: Record<PreviewKind, { w: number; h: number }> = {
  certificate: { w: 960, h: 720 }, // 10in x 7.5in @96dpi
  performance: { w: 794, h: 1122 }, // 8.27in x 11.69in @96dpi
  invoice: { w: 794, h: 1122 }, // 8.27in x 11.69in @96dpi
};

export function PreviewCard({ title, src, kind }: { title: string; src: string; kind: PreviewKind }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const { w: contentW, h: contentH } = CONTENT_PX[kind];

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setScale(el.clientWidth / contentW);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [contentW]);

  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="px-4 py-2 border-b text-sm font-medium text-gray-700">{title}</div>
      <div
        ref={containerRef}
        className="bg-gray-100 overflow-hidden relative"
        style={{ height: contentH * scale }}
      >
        <iframe
          src={src}
          className="border-0"
          style={{
            width: contentW,
            height: contentH,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        />
      </div>
    </div>
  );
}
