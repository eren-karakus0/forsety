import { jsPDF } from "jspdf";

interface PdfPackData {
  version?: string;
  generatedAt?: string;
  dataset?: {
    name?: string;
    description?: string | null;
    blobHash?: string | null;
    ownerAddress?: string;
    sizeBytes?: number | null;
  };
  licenses?: Array<{
    spdxType?: string;
    grantorAddress?: string;
  }>;
  policies?: Array<{
    version?: number;
    allowedAccessors?: string[];
    maxReads?: number | null;
    readsConsumed?: number;
    expiresAt?: string | null;
  }>;
  accessLog?: Array<{
    accessorAddress?: string;
    operationType?: string;
    readProof?: string | null;
    timestamp?: string;
  }>;
  agentActivity?: Array<{
    agentId?: string | null;
    toolName?: string | null;
    status?: string;
    timestamp?: string;
  }>;
}

function checkPage(doc: jsPDF, y: number, margin: number = 30): number {
  if (y > 270) {
    doc.addPage();
    return margin;
  }
  return y;
}

export function generateEvidencePackPdf(
  packData: PdfPackData,
  hash: string
): jsPDF {
  const doc = new jsPDF();
  const leftMargin = 14;
  let y = 20;

  // --- Header ---
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Forsety Evidence Pack", leftMargin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Hash: ${hash}`, leftMargin, y);
  y += 5;
  doc.text(`Generated: ${packData.generatedAt ? new Date(packData.generatedAt).toLocaleString() : "-"}`, leftMargin, y);
  y += 5;
  doc.text(`Version: ${packData.version ?? "-"}`, leftMargin, y);
  y += 10;
  doc.setTextColor(0);

  // --- Dataset Info ---
  if (packData.dataset) {
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Dataset Info", leftMargin, y);
    y += 7;

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const ds = packData.dataset;
    if (ds.name) { doc.text(`Name: ${ds.name}`, leftMargin, y); y += 5; }
    if (ds.ownerAddress) { doc.text(`Owner: ${ds.ownerAddress}`, leftMargin, y); y += 5; }
    if (ds.blobHash) { doc.text(`Blob Hash: ${ds.blobHash}`, leftMargin, y); y += 5; }
    if (ds.sizeBytes != null) { doc.text(`Size: ${ds.sizeBytes} bytes`, leftMargin, y); y += 5; }
    if (ds.description) { doc.text(`Description: ${ds.description}`, leftMargin, y); y += 5; }
    y += 5;
  }

  // --- Licenses ---
  if (packData.licenses && packData.licenses.length > 0) {
    y = checkPage(doc, y);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Licenses", leftMargin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("SPDX Type", leftMargin, y);
    doc.text("Grantor", 80, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const lic of packData.licenses) {
      y = checkPage(doc, y);
      doc.text(lic.spdxType ?? "-", leftMargin, y);
      doc.text(lic.grantorAddress ?? "-", 80, y);
      y += 5;
    }
    y += 5;
  }

  // --- Policies ---
  if (packData.policies && packData.policies.length > 0) {
    y = checkPage(doc, y);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Policies", leftMargin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Version", leftMargin, y);
    doc.text("Accessors", 40, y);
    doc.text("Reads", 120, y);
    doc.text("Expires", 155, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const pol of packData.policies) {
      y = checkPage(doc, y);
      doc.text(`v${pol.version ?? "?"}`, leftMargin, y);
      const accessors = pol.allowedAccessors?.length
        ? pol.allowedAccessors.slice(0, 3).map((a) => a === "*" ? "*" : a.slice(0, 10) + "...").join(", ")
        : "-";
      doc.text(accessors, 40, y);
      doc.text(`${pol.readsConsumed ?? 0}/${pol.maxReads ?? "\u221e"}`, 120, y);
      doc.text(pol.expiresAt ? new Date(pol.expiresAt).toLocaleDateString() : "-", 155, y);
      y += 5;
    }
    y += 5;
  }

  // --- Access Log ---
  if (packData.accessLog && packData.accessLog.length > 0) {
    y = checkPage(doc, y);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Access Log", leftMargin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Timestamp", leftMargin, y);
    doc.text("Accessor", 55, y);
    doc.text("Operation", 120, y);
    doc.text("Proof", 155, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const log of packData.accessLog) {
      y = checkPage(doc, y);
      doc.text(log.timestamp ? new Date(log.timestamp).toLocaleString() : "-", leftMargin, y);
      doc.text(log.accessorAddress ? log.accessorAddress.slice(0, 16) + "..." : "-", 55, y);
      doc.text(log.operationType ?? "-", 120, y);
      doc.text(log.readProof ? log.readProof.slice(0, 12) + "..." : "-", 155, y);
      y += 5;
    }
    y += 5;
  }

  // --- Agent Activity ---
  if (packData.agentActivity && packData.agentActivity.length > 0) {
    y = checkPage(doc, y);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Agent Activity", leftMargin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text("Timestamp", leftMargin, y);
    doc.text("Tool", 55, y);
    doc.text("Status", 120, y);
    y += 5;

    doc.setFont("helvetica", "normal");
    for (const act of packData.agentActivity) {
      y = checkPage(doc, y);
      doc.text(act.timestamp ? new Date(act.timestamp).toLocaleString() : "-", leftMargin, y);
      doc.text(act.toolName ?? "-", 55, y);
      doc.text(act.status ?? "-", 120, y);
      y += 5;
    }
    y += 5;
  }

  // --- Footer ---
  y = checkPage(doc, y);
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by Forsety", leftMargin, y);

  return doc;
}
