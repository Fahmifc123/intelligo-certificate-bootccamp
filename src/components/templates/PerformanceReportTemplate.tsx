import type { CSSProperties } from "react";
import type { ParticipantData } from "@/lib/types";

const LEGEND = [
  { range: "86 - 100", label: "Excellent" },
  { range: "75 - 85", label: "Good" },
  { range: "65 - 74", label: "Fair" },
  { range: "<= 64", label: "Poor" },
];

export function PerformanceReportTemplate({ data }: { data: ParticipantData }) {
  return (
    <div
      style={{
        position: "relative",
        width: "8.27in",
        height: "11.69in",
        background: "#ffffff",
        overflow: "hidden",
        fontFamily: "'Rubik', Arial, Helvetica, sans-serif",
        color: "#111827",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/performance-bg.png"
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
        }}
      />

      {/* Title */}
      <div
        style={{
          position: "absolute",
          left: "25%",
          top: "10.8%",
          width: "70%",
          fontSize: "22pt",
          fontWeight: 700,
          color: "#023047",
          letterSpacing: "1px",
        }}
      >
        PERFORMANCE REPORT
      </div>

      {/* Subtitle */}
      <div
        style={{
          position: "absolute",
          left: "10.5%",
          top: "18.4%",
          width: "58%",
          fontSize: "10.5pt",
          color: "#374151",
          lineHeight: 1.4,
        }}
      >
        Below is an overview of the learning journey and accomplishments over
        the specified period
      </div>

      {/* Info block */}
      <div
        style={{
          position: "absolute",
          left: "10.5%",
          top: "25.6%",
          width: "58%",
          fontSize: "10.5pt",
          lineHeight: 1.9,
        }}
      >
        <div>
          <strong>Full Name</strong> &nbsp;&nbsp;&nbsp;&nbsp;: {data.nama}
        </div>
        <div>
          <strong>Bootcamp</strong> &nbsp;&nbsp;&nbsp;&nbsp;: {data.judul}
        </div>
        <div>
          <strong>Batch</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {data.batch}
        </div>
        <div>
          <strong>Time Period</strong> &nbsp;&nbsp;: {data.pelaksanaan}
        </div>
      </div>

      {/* Photo */}
      <div
        style={{
          position: "absolute",
          left: "71.6%",
          top: "17.7%",
          width: "18.5%",
          height: "17.4%",
          borderRadius: "10px",
          overflow: "hidden",
          border: "3px solid #023047",
          background: "#f3f4f6",
        }}
      >
        {data.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.photoUrl}
            alt={data.nama}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : null}
      </div>

      {/* Module table */}
      <table
        style={{
          position: "absolute",
          left: "10.5%",
          top: "37%",
          width: "58%",
          borderCollapse: "collapse",
          fontSize: "10pt",
        }}
      >
        <thead>
          <tr>
            <th style={thStyle}>No</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Learning Module</th>
            <th style={thStyle}>Score</th>
          </tr>
        </thead>
        <tbody>
          {data.modules.map((m, i) => (
            <tr key={m.module} style={{ background: i % 2 === 0 ? "#ffffff" : "#F3F4F6" }}>
              <td style={tdStyle}>{i + 1}</td>
              <td style={{ ...tdStyle, textAlign: "left" }}>{m.module}</td>
              <td style={tdStyle}>{m.score}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Average score / grade */}
      <div
        style={{
          position: "absolute",
          left: "10.5%",
          top: `${37 + data.modules.length * 3.3 + 4}%`,
          width: "38%",
          fontSize: "11pt",
          lineHeight: 1.8,
        }}
      >
        <div>
          <strong>Average Score</strong> : {data.total.toFixed(2)}
        </div>
        <div>
          <strong>Grade</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;: {data.grade}
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          position: "absolute",
          left: "67.3%",
          top: `${37 + data.modules.length * 3.3 + 4}%`,
          width: "33%",
          fontSize: "9.5pt",
          lineHeight: 1.9,
          display: "flex",
        }}
      >
        <div style={{ marginRight: "8px" }}>
          {LEGEND.map((l) => (
            <div key={l.range}>{l.range}</div>
          ))}
        </div>
        <div>
          {LEGEND.map((l) => (
            <div key={l.label}>: {l.label}</div>
          ))}
        </div>
      </div>

      {/* Declaration */}
      <div
        style={{
          position: "absolute",
          left: "10.5%",
          top: `${37 + data.modules.length * 3.3 + 16}%`,
          width: "70%",
          fontSize: "9pt",
          lineHeight: 1.4,
          color: "#374151",
        }}
      >
        Hereby, Intelligo ID declares that the individual has been assessed
        to have successfully completed the bootcamp and is declared as
        passed.
      </div>
    </div>
  );
}

const thStyle: CSSProperties = {
  background: "#023047",
  color: "#ffffff",
  padding: "6px 8px",
  textAlign: "center",
  border: "1px solid #023047",
};

const tdStyle: CSSProperties = {
  padding: "5px 8px",
  textAlign: "center",
  border: "1px solid #E5E7EB",
};
