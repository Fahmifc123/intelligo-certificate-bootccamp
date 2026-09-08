import type { ParticipantData } from "./types";

export function buildEmailSubject(data: ParticipantData): string {
  return data.sendMode === "performance"
    ? `Certificate & Performance Report - ${data.judul} ${data.batch} - Intelligo ID`
    : `Certificate - ${data.judul} ${data.batch} - Intelligo ID`;
}

export function buildEmailHtml(data: ParticipantData): string {
  const performanceBlock =
    data.sendMode === "performance"
      ? `
        <div style="background-color:#F0F9FF;border-left:4px solid #2563EB;padding:14px 16px;margin:0 0 20px 0;border-radius:6px;">
          <p style="margin:0;">
            In addition to your certificate, we have also included your <strong>Performance Report</strong>.
            This report provides a detailed overview of your learning progress, strengths, and areas for improvement throughout the program.
          </p>
        </div>`
      : "";

  return `
<div style="font-family:'Rubik',Arial,Helvetica,sans-serif;font-size:14px;color:#023047;line-height:1.65;background-color:#F9FAFB;padding:24px;">
  <div style="max-width:620px;margin:0 auto;background-color:#FFFFFF;border-radius:10px;box-shadow:0 4px 12px rgba(2,48,71,0.08);overflow:hidden;">
    <div style="background-color:#023047;padding:20px 24px;">
      <h1 style="margin:0;font-size:18px;font-weight:600;color:#FFFFFF;letter-spacing:0.5px;">CERTIFICATE OF COMPLETION</h1>
      <p style="margin:4px 0 0 0;font-size:13px;color:#E5E7EB;">Intelligo ID Program</p>
    </div>
    <div style="padding:24px;">
      <p style="margin:0 0 16px 0;">Hi <strong>${data.nama}</strong>, congratulations!</p>
      <p style="margin:0 0 16px 0;">You have successfully completed the following bootcamp program at <strong>Intelligo ID</strong>:</p>
      <div style="background-color:#FFF3ED;border-left:4px solid #FF5400;padding:14px 16px;margin:0 0 20px 0;border-radius:6px;">
        <p style="margin:0;font-size:15px;"><strong>${data.judul} ${data.batch}</strong></p>
      </div>
      <p style="margin:0 0 16px 0;">Attached to this email is your <strong>Certificate of Completion</strong>, which serves as official proof of your participation and learning progress throughout the program.</p>
      ${performanceBlock}
      <p style="margin:0 0 20px 0;">If you'd like to continue learning through advanced modules, private mentoring, or job-ready guidance, feel free to reach out anytime.</p>
      <p style="margin:0 0 20px 0;">
        WhatsApp Admin:<br />
        <a href="https://www.intelligo.id/wa-mintell" style="color:#FF5400;text-decoration:none;">https://www.intelligo.id/wa-mintell</a>
      </p>
      <p style="margin:0 0 28px 0;">Thank you for learning with <strong>Intelligo ID</strong> — keep moving forward and stay curious!</p>
      <p style="margin:0;">Warm regards,<br /><strong style="color:#023047;">Team Intelligo ID</strong></p>
    </div>
  </div>
</div>`;
}
