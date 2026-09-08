import type { ReactNode } from "react";

export default function PrintLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <style>{`
        @page { margin: 0; }
        html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
      `}</style>
      {children}
    </div>
  );
}
