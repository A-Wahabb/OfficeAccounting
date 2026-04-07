import PDFDocument from "pdfkit";

import type { ReportBundle } from "@/types/reporting";

function collectPdfBuffer(doc: InstanceType<typeof PDFDocument>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });
    doc.on("end", () => {
      resolve(Buffer.concat(chunks));
    });
    doc.on("error", reject);
    doc.end();
  });
}

export async function exportReportPdf(bundle: ReportBundle): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50, size: "A4" });
  const out = collectPdfBuffer(doc);

  doc.fontSize(16).text("Accounting report", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(
    `Period: ${bundle.filters.from} to ${bundle.filters.to}` +
      (bundle.filters.office_id ? ` | Office filter: ${bundle.filters.office_id}` : "") +
      (bundle.filters.account_id ? ` | Account filter: ${bundle.filters.account_id}` : ""),
  );
  doc.moveDown();

  doc.fontSize(12).text("Transactions (posted)", { underline: true });
  doc.fontSize(9);
  for (const t of bundle.transactions) {
    doc.text(
      `${t.transaction_number}  ${t.transaction_date}  ${t.office_code}  ${t.type}  ${t.currency}`,
    );
    if (t.description) {
      doc.text(`  ${t.description}`, { indent: 10 });
    }
    for (const line of t.lines) {
      doc.text(
        `    ${line.line_number}. ${line.account_code} ${line.account_name}  DR ${line.debit}  CR ${line.credit}`,
        { indent: 14 },
      );
    }
    doc.moveDown(0.25);
  }

  doc.addPage();
  doc.fontSize(12).text("Balances (current ledger)", { underline: true });
  doc.fontSize(9);
  doc.text(
    "Point-in-time balances from account_balances after posted activity (RLS-scoped).",
  );
  doc.moveDown(0.5);
  for (const b of bundle.balances) {
    doc.text(
      `${b.office_code}  ${b.account_code}  ${b.account_name}  (${b.account_type})  ${b.balance}`,
    );
  }

  doc.addPage();
  doc.fontSize(12).text("Cash flow (CASH/BANK lines)", { underline: true });
  doc.fontSize(9);
  doc.text(
    "Daily net of signed line amounts (debit − credit, reversal-aware) on CASH and BANK accounts.",
  );
  doc.moveDown(0.5);
  for (const c of bundle.cash_flow) {
    doc.text(`${c.date}  ${c.net_change}`);
  }

  doc.end();
  return out;
}
