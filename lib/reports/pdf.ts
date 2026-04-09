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
  const selected = bundle.filters.report_type;
  const include = (key: Exclude<typeof selected, "all">) =>
    selected === "all" || selected === key;

  doc.fontSize(16).text("Accounting report", { underline: true });
  doc.moveDown(0.5);
  doc.fontSize(10);
  doc.text(
    `Period: ${bundle.filters.from} to ${bundle.filters.to}` +
      (bundle.filters.office_id ? ` | Office filter: ${bundle.filters.office_id}` : "") +
      (bundle.filters.account_id ? ` | Account filter: ${bundle.filters.account_id}` : "") +
      ` | Type: ${bundle.filters.report_type}`,
  );
  doc.moveDown();

  if (include("general_ledger")) {
    doc.fontSize(12).text("Transactions (approved)", { underline: true });
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
  }

  if (include("trial_balance")) {
    doc.fontSize(12).text("Trial balance", { underline: true });
    doc.fontSize(9);
    for (const row of bundle.trial_balance) {
      doc.text(
        `${row.office_code}  ${row.account_code}  ${row.account_name} (${row.account_type})  DR ${row.debit_total}  CR ${row.credit_total}  NET ${row.net_balance}`,
      );
    }
    doc.addPage();
  }

  if (include("headwise_expense")) {
    doc.fontSize(12).text("Headwise expense report", { underline: true });
    doc.fontSize(9);
    for (const row of bundle.headwise_expense) {
      doc.text(
        `${row.office_code}  ${row.account_code}  ${row.account_name}  ${row.expense_total}`,
      );
    }
    doc.addPage();
  }

  if (include("reconciliation")) {
    doc.fontSize(12).text("Reconciliation report", { underline: true });
    doc.fontSize(9);
    doc.text("Statement amount is pending external bank/cash statement import.");
    doc.moveDown(0.5);
    for (const row of bundle.reconciliation) {
      doc.text(
        `${row.office_code}  ${row.account_code}  ${row.account_name}  Ledger ${row.ledger_balance}  Status ${row.status}`,
      );
    }
    doc.addPage();
  }

  if (include("profit_and_loss")) {
    doc.fontSize(12).text("Profit and loss", { underline: true });
    doc.fontSize(9);
    doc.text(`Income total: ${bundle.profit_and_loss.income_total}`);
    doc.text(`Expense total: ${bundle.profit_and_loss.expense_total}`);
    doc.text(`Net profit: ${bundle.profit_and_loss.net_profit}`);
    doc.addPage();
  }

  if (include("cash_flow")) {
    doc.fontSize(12).text("Cash flow (CASH/BANK lines)", { underline: true });
    doc.fontSize(9);
    doc.text(
      "Daily net of signed line amounts (debit - credit, reversal-aware) on CASH and BANK accounts.",
    );
    doc.moveDown(0.5);
    for (const c of bundle.cash_flow) {
      doc.text(`${c.date}  ${c.net_change}`);
    }
  }

  doc.end();
  return out;
}
