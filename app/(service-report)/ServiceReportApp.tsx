"use client";

import React, { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Download, Printer, Upload, Trash2, Clipboard } from "lucide-react";

/** ---- Types ---- */
type ServiceTypes = {
  troubleshooting: boolean;
  inspection: boolean;
  dryDocking: boolean;
  others: boolean;
  othersText: string;
};

type Report = {
  vesselName: string;
  customerName: string;
  referenceNo: string;
  jobNumber: string;
  location: string;
  equipmentMakeModel: string;
  jobScope: string;
  summary: string;
  findings: string;
  preparedBy: string;
  jobStart: string; // yyyy-mm-dd
  jobEnd: string;   // yyyy-mm-dd
  wpLogoUrl: string;
  serviceTypes: ServiceTypes;
};

type ImgItem = { id: string; src: string; name: string; caption: string };

function formatDate(d?: string) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${p(dt.getDate())}/${p(dt.getMonth() + 1)}/${dt.getFullYear()}`;
  } catch {
    return d;
  }
}

function escapeHtml(str: string) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function fileToDataURL(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const printStyles = `
  :root { --navy: #0b1e56; }
  body { font-family: Arial, sans-serif; font-size: 10pt; }
  .pageNumber::after { content: counter(page); }
  .totalPages::after { content: counter(pages); }
  .navy-thin-border { border: 0.6pt solid var(--navy); }
  @media print {
    @page { size: A4; margin: 14mm 12mm 18mm 12mm; }
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, sans-serif; font-size: 10pt; }
    .print\\:hidden { display: none !important; }
    .print-footer { position: fixed; bottom: 6mm; left: 0; right: 0; }
  }
`;

export default function ServiceReportApp() {
  const [profiles] = useState([
    {
      id: "imi",
      name: "IMI CORPORATION PTE. LTD.",
      logo: "/logo_small.png", // put file in /public/logo_small.png (avoid spaces)
      addr1: "No. 13, Joo Koon Crescent, Singapore 629021",
      contacts: "Tel: (65) 6861 4222 | Fax: (65) 6862 4222",
      emailweb: "sales@imicorp.com.sg | www.imicorp.com.sg",
      reg: "Co. Reg. No.: 199205115N | GST No.: M2-0109564-6",
    },
    {
      id: "iti",
      name: "I.T.I. CORPORATION PTE. LTD.",
      logo: "/iti_corporation_logo.png", // put file in /public/iti_corporation_logo.png
      addr1: "No. 13, Joo Koon Crescent, Singapore 629021",
      contacts: "Tel: (65) 6861 4222 | Fax: (65) 6862 4222",
      emailweb: "",
      reg: "Co. Reg. No.: 197801784E | GST No.: M200315839",
    },
  ]);

  const [activeProfile, setActiveProfile] = useState("imi");
  const header = profiles.find((p) => p.id === activeProfile)!;
  const [wpUseSelectedProfile, setWpUseSelectedProfile] = useState(true);

  const [report, setReport] = useState<Report>({
    vesselName: "",
    customerName: "",
    referenceNo: "",
    jobNumber: "",
    location: "",
    equipmentMakeModel: "",
    jobScope: "",
    summary: "",
    findings: "",
    preparedBy: "",
    jobStart: "",
    jobEnd: "",
    wpLogoUrl: "",
    serviceTypes: {
      troubleshooting: false,
      inspection: false,
      dryDocking: false,
      others: false,
      othersText: "",
    },
  });

  const [images, setImages] = useState<ImgItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const printAreaRef = useRef<HTMLDivElement | null>(null);

  const addFiles = async (files: FileList | null) => {
    const arr = Array.from(files || []);
    const mapped = await Promise.all(
      arr.map(async (f, idx) => {
        const src = await fileToDataURL(f);
        return { id: `${Date.now()}-${idx}`, src, name: f.name, caption: "" };
      })
    );
    setImages((prev) => [...prev, ...mapped]);
  };

  const updateImage = (id: string, patch: Partial<ImgItem>) =>
    setImages((prev) => prev.map((img) => (img.id === id ? { ...img, ...patch } : img)));

  const removeImage = (id: string) =>
    setImages((prev) => prev.filter((img) => img.id !== id));

  const onPrint = () => window.print();

  const exportHtml = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Service Report - ${escapeHtml(report.vesselName || "Untitled")}</title>
      <style>${printStyles}</style>
      </head><body style="font-family: Arial, sans-serif; font-size: 10pt;">${printAreaRef.current?.innerHTML || ""}</body></html>`;

    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeVessel = (report.vesselName || "Untitled").replace(/[^a-z0-9-_]+/gi, "_");
    a.href = url;
    a.download = `Service_Report_${safeVessel}.html`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const toggleService = (key: keyof ServiceTypes) =>
    setReport((r) => ({ ...r, serviceTypes: { ...r.serviceTypes, [key]: !r.serviceTypes[key] } }));

  const ensureDataUrl = async (src: string) => {
    if (!src) return "";
    if (src.startsWith("data:")) return src;
    try {
      const res = await fetch(src);
      const blob = await res.blob();
      return await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    } catch {
      return src;
    }
  };

  const buildWpHtml = async () => {
    const wpHeader = wpUseSelectedProfile ? header : profiles.find((p) => p.id === "imi") || header;
    const logoSrc = report.wpLogoUrl?.trim() ? report.wpLogoUrl.trim() : wpHeader.logo || "";
    const logoData = logoSrc.startsWith("http") ? logoSrc : await ensureDataUrl(logoSrc);
    const esc = escapeHtml;
    const jobDate =
      report.jobStart || report.jobEnd
        ? `${formatDate(report.jobStart) || "__/__/____"} to ${formatDate(report.jobEnd) || "__/__/____"}`
        : "__/__/____ to __/__/____";

    const photos = images.length
      ? images
          .map(
            (img, i) => `
          <figure style="margin:0; padding:4px;">
            <div style="width:100%; height:200px; border:0.5px solid #999; background:#fff; overflow:hidden;">
              <img src="${img.src}" alt="${esc(img.name)}" style="width:100%; height:100%; object-fit:contain;" />
            </div>
            <figcaption style="margin-top:4px; text-align:center;"><strong>Fig ${i + 1}:</strong> ${esc(img.caption || "")}</figcaption>
          </figure>`
          )
          .join("")
      : `<div style="color:#64748b;">(No photos uploaded)</div>`;

    return `
<div style="font-family:Arial, sans-serif; font-size:10pt; color:#111;">
  <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:12px; border-bottom:0.6pt solid #0b1e56; padding-bottom:4px; margin-bottom:8px;">
    ${logoData ? `<img src="${logoData}" alt="Company Logo" style="height:64px; object-fit:contain;" />` : ``}
    <div style="text-align:right; line-height:1.2;">
      <div style="font-weight:700;">${esc(wpHeader.name)}</div>
      <div>${esc(wpHeader.addr1 || "")}</div>
      <div>${esc(wpHeader.contacts || "")}</div>
      ${wpHeader.emailweb ? `<div>${esc(wpHeader.emailweb)}</div>` : ``}
      <div>${esc(wpHeader.reg || "")}</div>
    </div>
  </div>

  <h2 style="margin:6px 0; text-align:center; color:#0b1e56; font-weight:700; font-size:12pt; text-transform:uppercase; letter-spacing:0.5px;">Service Report</h2>

  <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-top:6px;">
    <colgroup><col style="width:50%" /><col style="width:50%" /></colgroup>
    <tr style="background:#0b1e56; color:#fff;">
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Customer Name</th>
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Vessel Name</th>
    </tr>
    <tr>
      <td style="border:1px solid #000; padding:6px;">${esc(report.customerName || "-")}</td>
      <td style="border:1px solid #000; padding:6px;">${esc(report.vesselName || "-")}</td>
    </tr>
    <tr style="background:#0b1e56; color:#fff;">
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Reference No.</th>
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Job Number</th>
    </tr>
    <tr>
      <td style="border:1px solid #000; padding:6px;">${esc(report.referenceNo || "-")}</td>
      <td style="border:1px solid #000; padding:6px;">${esc(report.jobNumber || "-")}</td>
    </tr>
    <tr style="background:#0b1e56; color:#fff;">
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Job Date</th>
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Location</th>
    </tr>
    <tr>
      <td style="border:1px solid #000; padding:6px;">${jobDate}</td>
      <td style="border:1px solid #000; padding:6px;">${esc(report.location || "-")}</td>
    </tr>
    <tr style="background:#0b1e56; color:#fff;">
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;" colspan="2">Service Type</th>
    </tr>
    <tr>
      <td style="border:1px solid #000; padding:6px;" colspan="2">
        ${report.serviceTypes.troubleshooting ? "■" : "□"} Troubleshooting &nbsp;&nbsp;
        ${report.serviceTypes.inspection ? "■" : "□"} Inspection &nbsp;&nbsp;
        ${report.serviceTypes.dryDocking ? "■" : "□"} Dry-docking &nbsp;&nbsp;
        ${report.serviceTypes.others ? "■" : "□"} Others: <span style="text-decoration:underline;">${esc(report.serviceTypes.othersText || "")}</span>
      </td>
    </tr>
  </table>

  <div style="margin-top:8px; border:1px solid #000;">
    <div style="background:#0b1e56; color:#fff; padding:4px 8px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Job Scope</div>
    <div style="padding:8px; white-space:pre-wrap;">${esc(report.jobScope || "")}</div>

    <div style="border-top:1px solid #000; background:#0b1e56; color:#fff; padding:4px 8px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Findings</div>
    <div style="padding:8px; white-space:pre-wrap;">${esc(report.findings || "")}</div>
    <div style="padding:8px; display:grid; grid-template-columns: repeat( auto-fit, minmax(180px, 1fr) ); gap:8px;">${photos}</div>

    <div style="border-top:1px solid #000; padding:4px 8px; font-weight:600;">Summary</div>
    <div style="padding:8px; white-space:pre-wrap;">${esc(report.summary || "")}</div>
  </div>

  <table style="width:100%; border-collapse:collapse; border:1px solid #000; margin-top:8px;">
    <tr style="background:#0b1e56; color:#fff;">
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Prepared By</th>
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Date</th>
      <th style="border:0.6pt solid #0b1e56; text-align:left; padding:4px 6px;">Page No.</th>
    </tr>
    <tr>
      <td style="border:1px solid #000; padding:6px;">${esc(report.preparedBy || "")}</td>
      <td style="border:1px solid #000; padding:6px;">${formatDate(report.jobEnd) || formatDate(report.jobStart) || "__/__/____"}</td>
      <td style="border:1px solid #000; padding:6px;">Page __ of __</td>
    </tr>
  </table>
  <div style="font-size:9pt; margin-top:4px;">This service report is issued strictly subject to our Terms & Conditions 2025 which can be found on our website.</div>
</div>`;
  };

  const copyWpHtml = async () => {
    const html = await buildWpHtml();
    try {
      await navigator.clipboard.writeText(html);
      alert("WordPress HTML copied. In WordPress: add a 'Custom HTML' block and paste.");
    } catch {
      const blob = new Blob([html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "service-report-wordpress.html";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-[Arial] text-[10pt]">
      {/* Controls */}
      <div className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-3 flex flex-wrap items-center gap-2">
          <select
            value={activeProfile}
            onChange={(e) => setActiveProfile(e.target.value)}
            className="border p-1 text-sm"
          >
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>

          <Button onClick={() => fileInputRef.current?.click()} className="gap-2" variant="secondary">
            <Upload className="h-4 w-4" /> Add Photos
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => addFiles(e.target.files)}
          />

          <Button onClick={onPrint} className="gap-2">
            <Printer className="h-4 w-4" /> Print / Save PDF
          </Button>
          <Button onClick={exportHtml} variant="outline" className="gap-2">
            <Download className="h-4 w-4" /> Export HTML
          </Button>
          <Button onClick={copyWpHtml} variant="outline" className="gap-2">
            <Clipboard className="h-4 w-4" /> Copy WP HTML
          </Button>

          <label className="flex items-center gap-2 ml-auto text-[9pt]">
            <input
              type="checkbox"
              checked={wpUseSelectedProfile}
              onChange={(e) => setWpUseSelectedProfile(e.target.checked)}
            />
            <span>Use selected profile for WP export</span>
          </label>
        </div>
      </div>

      {/* Editor */}
      <div className="mx-auto max-w-5xl px-4 py-6 print:hidden">
        <div className="grid gap-4 md:grid-cols-2">
          {/* left card */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-slate-700">Vessel &amp; Job Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label>Customer Name</label>
              <Input
                value={report.customerName}
                onChange={(e) => setReport({ ...report, customerName: e.target.value })}
              />

              <label>Vessel Name</label>
              <Input
                value={report.vesselName}
                onChange={(e) => setReport({ ...report, vesselName: e.target.value })}
              />

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label>Reference No.</label>
                  <Input
                    value={report.referenceNo}
                    onChange={(e) => setReport({ ...report, referenceNo: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label>Job Number</label>
                  <Input
                    value={report.jobNumber}
                    onChange={(e) => setReport({ ...report, jobNumber: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div className="grid gap-2">
                  <label>Job Start</label>
                  <Input
                    type="date"
                    value={report.jobStart}
                    onChange={(e) => setReport({ ...report, jobStart: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <label>Job End</label>
                  <Input
                    type="date"
                    value={report.jobEnd}
                    onChange={(e) => setReport({ ...report, jobEnd: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label>Location</label>
                <Input
                  value={report.location}
                  onChange={(e) => setReport({ ...report, location: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <label>Service Type</label>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={report.serviceTypes.troubleshooting}
                      onChange={() => toggleService("troubleshooting")}
                    />{" "}
                    Troubleshooting
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={report.serviceTypes.inspection}
                      onChange={() => toggleService("inspection")}
                    />{" "}
                    Inspection
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={report.serviceTypes.dryDocking}
                      onChange={() => toggleService("dryDocking")}
                    />{" "}
                    Dry-docking
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={report.serviceTypes.others}
                      onChange={() => toggleService("others")}
                    />{" "}
                    Others
                  </label>
                  <Input
                    className="w-64"
                    placeholder="specify"
                    value={report.serviceTypes.othersText}
                    onChange={(e) =>
                      setReport({
                        ...report,
                        serviceTypes: { ...report.serviceTypes, othersText: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <label>EQUIPMENT MAKE &amp; MODEL</label>
                <Input
                  value={report.equipmentMakeModel}
                  onChange={(e) => setReport({ ...report, equipmentMakeModel: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <label>JOB SCOPE</label>
                <Textarea
                  rows={4}
                  value={report.jobScope}
                  onChange={(e) => setReport({ ...report, jobScope: e.target.value })}
                />
              </div>

              {/* WordPress-specific logo override */}
              <div className="grid gap-2">
                <label>WordPress Logo URL (optional)</label>
                <Input
                  placeholder="https://your-site.com/wp-content/uploads/logo.png"
                  value={report.wpLogoUrl}
                  onChange={(e) => setReport({ ...report, wpLogoUrl: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <label>Prepared By</label>
                  <Input
                    value={report.preparedBy}
                    onChange={(e) => setReport({ ...report, preparedBy: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* right card */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-slate-700">
                Summary &amp; Findings (to print after photos)
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              <label>Summary</label>
              <Textarea
                rows={6}
                value={report.summary}
                onChange={(e) => setReport({ ...report, summary: e.target.value })}
              />
              <label>Findings</label>
              <Textarea
                rows={6}
                value={report.findings}
                onChange={(e) => setReport({ ...report, findings: e.target.value })}
              />
            </CardContent>
          </Card>

          {/* Photos & Captions */}
          <Card className="shadow-sm border">
            <CardHeader>
              <CardTitle className="text-slate-700">Photos &amp; Captions</CardTitle>
            </CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <p className="text-slate-500">No photos yet. Use “Add Photos” above.</p>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {images.map((img) => (
                    <div key={img.id} className="p-1">
                      <div className="w-full h-24 border border-[0.5px] bg-white overflow-hidden">
                        <img src={img.src} alt={img.name} className="w-full h-full object-contain" />
                      </div>
                      <Input
                        className="mt-2"
                        placeholder="Caption"
                        value={img.caption}
                        onChange={(e) => updateImage(img.id, { caption: e.target.value })}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeImage(img.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Printable Area */}
      <div ref={printAreaRef} className="mx-auto max-w-[210mm] bg-white px-6 pt-6 pb-24 print:px-0">
        {/* Header */}
        <header className="print:mx-0">
          <div className="flex items-center justify-between gap-4">
            {header.logo && (
              <img src={header.logo} alt="Company Logo" className="h-16 object-contain" />
            )}
            <div className="text-right leading-tight">
              <div className="font-bold">{header.name}</div>
              <div>{header.addr1}</div>
              <div>{header.contacts}</div>
              {header.emailweb && <div>{header.emailweb}</div>}
              <div>{header.reg}</div>
            </div>
          </div>
          <div className="mt-2 h-px w-full bg-[#0b1e56]" />
        </header>

        {/* Title */}
        <h2 className="mt-3 text-center font-bold uppercase tracking-wide text-[#0b1e56] text-[12pt]">
          SERVICE REPORT
        </h2>

        {/* Job meta */}
        <section className="mt-3">
          <table className="w-full border border-black border-collapse table-fixed text-[10pt]">
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/2" />
            </colgroup>
            <tbody>
              <tr className="bg-[#0b1e56] text-white">
                <th className="navy-thin-border px-2 py-1 text-left">Customer Name</th>
                <th className="navy-thin-border px-2 py-1 text-left">Vessel Name</th>
              </tr>
              <tr>
                <td className="border border-black p-2">{report.customerName || "-"}</td>
                <td className="border border-black p-2">{report.vesselName || "-"}</td>
              </tr>
              <tr className="bg-[#0b1e56] text-white">
                <th className="navy-thin-border px-2 py-1 text-left">Reference No.</th>
                <th className="navy-thin-border px-2 py-1 text-left">Job Number</th>
              </tr>
              <tr>
                <td className="border border-black p-2">{report.referenceNo || "-"}</td>
                <td className="border border-black p-2">{report.jobNumber || "-"}</td>
              </tr>
              <tr className="bg-[#0b1e56] text-white">
                <th className="navy-thin-border px-2 py-1 text-left">Job Date</th>
                <th className="navy-thin-border px-2 py-1 text-left">Location</th>
              </tr>
              <tr>
                <td className="border border-black p-2">
                  {report.jobStart || report.jobEnd
                    ? `${formatDate(report.jobStart) || "__/__/____"} to ${formatDate(report.jobEnd) || "__/__/____"}`
                    : "__/__/____ to __/__/____"}
                </td>
                <td className="border border-black p-2">{report.location || "-"}</td>
              </tr>
              <tr className="bg-[#0b1e56] text-white">
                <th className="navy-thin-border px-2 py-1 text-left" colSpan={2}>
                  Service Type
                </th>
              </tr>
              <tr>
                <td className="border border-black p-2" colSpan={2}>
                  <span className="inline-flex flex-wrap items-center gap-x-8 gap-y-1 align-middle">
                    <span className="inline-flex items-center">
                      <span
                        className={`inline-block w-3 h-3 border border-black mr-2 ${
                          report.serviceTypes.troubleshooting ? "bg-black" : ""
                        }`}
                      />
                      Troubleshooting
                    </span>
                    <span className="inline-flex items-center">
                      <span
                        className={`inline-block w-3 h-3 border border-black mr-2 ${
                          report.serviceTypes.inspection ? "bg-black" : ""
                        }`}
                      />
                      Inspection
                    </span>
                    <span className="inline-flex items-center">
                      <span
                        className={`inline-block w-3 h-3 border border-black mr-2 ${
                          report.serviceTypes.dryDocking ? "bg-black" : ""
                        }`}
                      />
                      Dry-docking
                    </span>
                    <span className="inline-flex items-center">
                      <span
                        className={`inline-block w-3 h-3 border border-black mr-2 ${
                          report.serviceTypes.others ? "bg-black" : ""
                        }`}
                      />
                      Others:{" "}
                      <span className="ml-2 underline decoration-black decoration-1">
                        {report.serviceTypes.othersText || ""}
                      </span>
                    </span>
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Scope + Findings + Summary */}
        <section className="mt-3 break-inside-avoid-page">
          <div className="border border-black">
            <div className="bg-[#0b1e56] text-white px-3 py-1 font-semibold uppercase tracking-wide">
              Job Scope
            </div>
            <div className="p-4 whitespace-pre-wrap">{report.jobScope || ""}</div>

            <div className="border-t border-black bg-[#0b1e56] text-white px-3 py-1 font-semibold uppercase tracking-wide">
              Findings
            </div>
            <div className="p-4 whitespace-pre-wrap">
              {report.findings || ""}
              {images.length > 0 ? (
                <div className="mt-3">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {images.map((img, i) => (
                      <figure key={img.id} className="p-1">
                        <div className="w-full h-[12.5rem] border border-[0.5px] bg-white overflow-hidden">
                          <img src={img.src} alt={img.name} className="w-full h-full object-contain" />
                        </div>
                        <figcaption className="mt-1 text-center">
                          <span className="font-semibold">Fig {i + 1}:</span> {img.caption || ""}
                        </figcaption>
                      </figure>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-3 text-slate-500">(No photos uploaded)</div>
              )}
            </div>

            <div className="border-t border-black px-3 py-2 font-semibold">Summary</div>
            <div className="p-4 whitespace-pre-wrap">{report.summary || ""}</div>
          </div>
        </section>

        {/* Footer */}
        <footer className="print-footer text-slate-700">
          <table className="w-full border border-black border-collapse table-fixed text-[10pt]">
            <colgroup>
              <col className="w-1/2" />
              <col className="w-1/4" />
              <col className="w-1/4" />
            </colgroup>
            <thead>
              <tr className="bg-[#0b1e56] text-white">
                <th className="navy-thin-border px-2 py-1 text-left">Prepared By</th>
                <th className="navy-thin-border px-2 py-1 text-left">Date</th>
                <th className="navy-thin-border px-2 py-1 text-left">Page No.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-black p-2 align-top">{report.preparedBy || ""}</td>
                <td className="border border-black p-2 align-top">
                  {formatDate(report.jobEnd) || formatDate(report.jobStart) || "__/__/____"}
                </td>
                <td className="border border-black p-2 align-top">
                  Page <span className="pageNumber" /> of <span className="totalPages" />
                </td>
              </tr>
            </tbody>
          </table>
          <div className="text-[9pt] mt-1">
            This service report is issued strictly subject to our Terms & Conditions 2025 which can be found on our
            website.
          </div>
        </footer>
      </div>

      <style>{printStyles}</style>
    </div>
  );
}
