import type { ParticipantData } from "@/lib/types";

export function CertificateTemplate({ data }: { data: ParticipantData }) {
  return (
    <div
      style={{
        position: "relative",
        width: "10in",
        height: "7.5in",
        background: "#ffffff",
        overflow: "hidden",
        fontFamily: "'Rubik', Arial, Helvetica, sans-serif",
        color: "#111827",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/certificate-bg.png"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
        }}
      />

      {/* Recipient name */}
      <div
        style={{
          position: "absolute",
          left: "0%",
          top: "40.5%",
          width: "100%",
          textAlign: "left",
          paddingLeft: "0.4in",
          fontSize: "34pt",
          fontWeight: 700,
          color: "#023047",
        }}
      >
        {data.nama}
      </div>

      {/* Body paragraph */}
      <div
        style={{
          position: "absolute",
          left: "0.42in",
          top: "54.8%",
          width: "8.4in",
          fontSize: "14pt",
          lineHeight: 1.55,
          color: "#111827",
        }}
      >
        <div>Has Successfully Completed</div>
        <div style={{ fontWeight: 700, fontSize: "15pt", color: "#023047" }}>
          {data.judul} ({data.batch})
        </div>
        <div>held from {data.pelaksanaan}</div>
      </div>

      {/* Score / Grade / Certificate ID */}
      <div
        style={{
          position: "absolute",
          left: "67.8%",
          top: "90.1%",
          width: "29.3%",
          fontSize: "9.5pt",
          lineHeight: 1.5,
          color: "#111827",
        }}
      >
        <div>
          Score | Grade&nbsp;&nbsp;: {data.total.toFixed(2)} | {data.grade}
        </div>
        <div>Certificate ID&nbsp;&nbsp;: {data.id}</div>
      </div>

      {/* Signature */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/signature.png"
        alt=""
        style={{
          position: "absolute",
          left: "4.84%",
          top: "80.8%",
          width: "10.2%",
          height: "7.1%",
          objectFit: "contain",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "3.83%",
          top: "89.3%",
          width: "20.75%",
          fontSize: "10.5pt",
          lineHeight: 1.4,
        }}
      >
        <div style={{ fontWeight: 700 }}>Muhammad Fahmi</div>
        <div>Head of Learning</div>
      </div>
    </div>
  );
}
