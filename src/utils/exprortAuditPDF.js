import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportAuditPDF(audit) {
  const el = document.createElement("div");
  el.style.cssText = `
    position: fixed;
    top: -9999px;
    left: 0;
    width: 800px;
    padding: 40px;
    background: white;
    font-family: Arial, sans-serif;
    color: #111;
  `;

  const scoreColor = (s) =>
    s >= 70 ? "#16a34a" : s >= 50 ? "#ea580c" : "#c0392b";

  const categoryHTML = (title, data) => {
    if (!data?.issues) return "";
    return `
      <div style="margin-bottom:28px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
          <div style="width:48px;height:48px;border-radius:50%;background:${scoreColor(data.score)};
            display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:14px;">
            ${data.score}
          </div>
          <h2 style="margin:0;font-size:18px;font-weight:700;">${title}</h2>
        </div>
        ${(data.issues || []).map(issue => `
          <div style="border:1px solid #eee;border-radius:8px;padding:12px;margin-bottom:8px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="font-size:13px;font-weight:600;">${issue.title}</span>
              <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:${
                issue.severity === "critical" ? "#fee2e2" :
                issue.severity === "warning"  ? "#fef9c3" :
                issue.severity === "good"     ? "#dcfce7" : "#dbeafe"
              };color:${
                issue.severity === "critical" ? "#c0392b" :
                issue.severity === "warning"  ? "#b7770d" :
                issue.severity === "good"     ? "#16a34a" : "#1a5fa8"
              };">${issue.severity}</span>
            </div>
            <p style="margin:0;font-size:12px;color:#555;line-height:1.5;">${issue.description}</p>
            ${issue.fix?.text ? `<p style="margin:6px 0 0;font-size:12px;color:#16a34a;">Fix: ${issue.fix.text}</p>` : ""}
          </div>
        `).join("")}
      </div>
    `;
  };

  el.innerHTML = `
    <div style="border-bottom:3px solid #7c3aed;padding-bottom:20px;margin-bottom:28px;">
      <h1 style="margin:0 0 4px;font-size:26px;font-weight:800;color:#0f0f1a;">WebIQ Audit Report</h1>
      <p style="margin:0;color:#888;font-size:14px;">${audit.url} · ${new Date(audit.auditedAt || Date.now()).toLocaleDateString()}</p>
    </div>

    <div style="display:flex;gap:12px;margin-bottom:32px;">
      ${["seo","performance","security","conversion"].map(cat => `
        <div style="flex:1;text-align:center;padding:16px;background:#f8f8f8;border-radius:12px;">
          <div style="font-size:24px;font-weight:800;color:${scoreColor(audit[cat]?.score || 0)}">
            ${audit[cat]?.score ?? "—"}
          </div>
          <div style="font-size:11px;color:#888;text-transform:uppercase;margin-top:4px;">${cat}</div>
        </div>
      `).join("")}
    </div>

    ${categoryHTML("SEO Audit", audit.seo)}
    ${categoryHTML("Performance Audit", audit.performance)}
    ${categoryHTML("Security Audit", audit.security)}
    ${categoryHTML("Conversion Audit", audit.conversion)}
  `;

  document.body.appendChild(el);

  try {
    const canvas = await html2canvas(el, { scale: 1.5, useCORS: true, logging: false });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: "a4" });

    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgH  = (canvas.height * pageW) / canvas.width;

    let y = 0;
    while (y < imgH) {
      if (y > 0) pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, -y, pageW, imgH);
      y += pageH;
    }

    const filename = audit.url
      .replace(/https?:\/\//, "")
      .replace(/[^a-z0-9]/gi, "-")
      .toLowerCase();
    pdf.save(`webiq-${filename}.pdf`);

  } finally {
    document.body.removeChild(el);
  }
}