import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

import type { ReportBundle } from "@/types/reporting";

const PAGE_WIDTH = 595.28; // A4 width in pt
const PAGE_HEIGHT = 841.89; // A4 height in pt
const PAGE_MARGIN = 42;
const BODY_SIZE = 9;
const SMALL_SIZE = 8;
const TITLE_SIZE = 16;
const SECTION_SIZE = 11;
const LINE_HEIGHT = 15;

const REPORT_TYPE_LABELS: Record<ReportBundle["filters"]["report_type"], string> = {
  all: "All Reports",
  trial_balance: "Trial Balance",
  headwise_expense: "Headwise Expense Report",
  reconciliation: "Reconciliation Report",
  general_ledger: "General Ledger",
  profit_and_loss: "Profit and Loss Statement",
  cash_flow: "Cash Flow Statement",
};

function formatAmount(value: number): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export async function exportReportPdf(bundle: ReportBundle): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - PAGE_MARGIN;
  const safeText = (text: string): string => text.replace(/[^\x20-\x7E]/g, " ");

  const ensureSpace = (required = LINE_HEIGHT): void => {
    if (y - required < PAGE_MARGIN + 24) {
      page = doc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - PAGE_MARGIN;
    }
  };

  const drawText = (text: string, size = BODY_SIZE, isBold = false): void => {
    ensureSpace();
    page.drawText(safeText(text), {
      x: PAGE_MARGIN,
      y,
      size,
      font: isBold ? bold : regular,
    });
    y -= LINE_HEIGHT;
  };

  const sectionTitle = (title: string): void => {
    y -= 6;
    ensureSpace(LINE_HEIGHT * 2);
    page.drawLine({
      start: { x: PAGE_MARGIN, y: y + 8 },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: y + 8 },
      thickness: 0.7,
      color: rgb(0.78, 0.78, 0.78),
    });
    drawText(title, SECTION_SIZE, true);
  };

  const drawRow = (
    columns: { text: string; width: number; align?: "left" | "right" | "center" }[],
    opts?: { bold?: boolean; shade?: boolean; size?: number },
  ): void => {
    const size = opts?.size ?? BODY_SIZE;
    ensureSpace(LINE_HEIGHT + 1);
    if (opts?.shade) {
      page.drawRectangle({
        x: PAGE_MARGIN,
        y: y - 1,
        width: PAGE_WIDTH - PAGE_MARGIN * 2,
        height: LINE_HEIGHT,
        color: rgb(0.96, 0.96, 0.96),
      });
    }
    const activeFont = opts?.bold ? bold : regular;
    let x = PAGE_MARGIN;
    for (const col of columns) {
      const maxWidth = col.width - 4;
      let text = safeText(col.text);
      while (activeFont.widthOfTextAtSize(text, size) > maxWidth && text.length > 3) {
        text = `${text.slice(0, -4)}...`;
      }
      const textWidth = activeFont.widthOfTextAtSize(text, size);
      const drawX =
        col.align === "right"
          ? x + col.width - textWidth - 2
          : col.align === "center"
            ? x + (col.width - textWidth) / 2
            : x + 2;
      page.drawText(text, {
        x: drawX,
        y: y + (LINE_HEIGHT - size) / 2 - 1,
        size,
        font: activeFont,
      });
      x += col.width;
    }
    y -= LINE_HEIGHT;
  };

  const selected = bundle.filters.report_type;
  const include = (key: Exclude<typeof selected, "all">) => selected === "all" || selected === key;

  drawText("Office Accounting Report", TITLE_SIZE, true);
  drawText(`Report Type: ${REPORT_TYPE_LABELS[selected]}`);
  drawText(`Period: ${bundle.filters.from} to ${bundle.filters.to}`);
  drawText(`Office Filter: ${bundle.filters.office_id ?? "All Offices"}`);
  drawText(`Account Filter: ${bundle.filters.account_id ?? "All Accounts"}`);
  y -= 2;

  if (include("general_ledger")) {
    sectionTitle("General Ledger");
    drawText(`Entries: ${bundle.general_ledger.length}`, SMALL_SIZE);
    drawRow(
      [
        { text: "Date", width: 56, align: "center" },
        { text: "Txn", width: 70, align: "center" },
        { text: "Office", width: 90, align: "center" },
        { text: "Account", width: 145 },
        { text: "Debit", width: 50, align: "right" },
        { text: "Credit", width: 50, align: "right" },
        { text: "Running", width: 50, align: "right" },
      ],
      { bold: true, shade: true, size: SMALL_SIZE },
    );
    let stripe = false;
    for (const row of bundle.general_ledger) {
      drawRow(
        [
          { text: row.date, width: 56, align: "center" },
          { text: row.transaction_number, width: 70, align: "center" },
          { text: row.office_name, width: 90, align: "center" },
          { text: `${row.account_code} ${row.account_name}`, width: 145 },
          { text: formatAmount(row.debit), width: 50, align: "right" },
          { text: formatAmount(row.credit), width: 50, align: "right" },
          { text: formatAmount(row.running_balance), width: 50, align: "right" },
        ],
        { shade: stripe, size: SMALL_SIZE },
      );
      stripe = !stripe;
    }
  }

  if (include("trial_balance")) {
    sectionTitle("Trial Balance");
    const totalDebit = bundle.trial_balance.reduce((s, r) => s + r.debit_total, 0);
    const totalCredit = bundle.trial_balance.reduce((s, r) => s + r.credit_total, 0);
    drawText(
      `Rows: ${bundle.trial_balance.length} | Debit: ${formatAmount(totalDebit)} | Credit: ${formatAmount(totalCredit)}`,
      SMALL_SIZE,
    );
    drawRow(
      [
        { text: "Office", width: 100, align: "center" },
        { text: "Code", width: 62, align: "center" },
        { text: "Account Name", width: 172 },
        { text: "Type", width: 60, align: "center" },
        { text: "Debit", width: 58, align: "right" },
        { text: "Credit", width: 58, align: "right" },
      ],
      { bold: true, shade: true, size: SMALL_SIZE },
    );
    let stripe = false;
    for (const row of bundle.trial_balance) {
      drawRow(
        [
          { text: row.office_name, width: 100, align: "center" },
          { text: row.account_code, width: 62, align: "center" },
          { text: row.account_name, width: 172 },
          { text: row.account_type, width: 60, align: "center" },
          { text: formatAmount(row.debit_total), width: 58, align: "right" },
          { text: formatAmount(row.credit_total), width: 58, align: "right" },
        ],
        { shade: stripe, size: SMALL_SIZE },
      );
      stripe = !stripe;
    }
  }

  if (include("headwise_expense")) {
    sectionTitle("Headwise Expense");
    const totalExpense = bundle.headwise_expense.reduce((s, r) => s + r.expense_total, 0);
    drawText(
      `Rows: ${bundle.headwise_expense.length} | Total Expense: ${formatAmount(totalExpense)}`,
      SMALL_SIZE,
    );
    drawRow(
      [
        { text: "Office", width: 110, align: "center" },
        { text: "Code", width: 72, align: "center" },
        { text: "Account Name", width: 228 },
        { text: "Expense", width: 102, align: "right" },
      ],
      { bold: true, shade: true, size: SMALL_SIZE },
    );
    let stripe = false;
    for (const row of bundle.headwise_expense) {
      drawRow(
        [
          { text: row.office_name, width: 110, align: "center" },
          { text: row.account_code, width: 72, align: "center" },
          { text: row.account_name, width: 228 },
          { text: formatAmount(row.expense_total), width: 102, align: "right" },
        ],
        { shade: stripe, size: SMALL_SIZE },
      );
      stripe = !stripe;
    }
  }

  if (include("reconciliation")) {
    sectionTitle("Reconciliation");
    drawText("Statement amount import is pending; status may remain pending.", SMALL_SIZE);
    drawRow(
      [
        { text: "Office", width: 110, align: "center" },
        { text: "Code", width: 66, align: "center" },
        { text: "Account Name", width: 170 },
        { text: "Ledger", width: 98, align: "right" },
        { text: "Status", width: 66, align: "center" },
      ],
      { bold: true, shade: true, size: SMALL_SIZE },
    );
    let stripe = false;
    for (const row of bundle.reconciliation) {
      drawRow(
        [
          { text: row.office_name, width: 110, align: "center" },
          { text: row.account_code, width: 66, align: "center" },
          { text: row.account_name, width: 170 },
          { text: formatAmount(row.ledger_balance), width: 98, align: "right" },
          { text: row.status, width: 66, align: "center" },
        ],
        { shade: stripe, size: SMALL_SIZE },
      );
      stripe = !stripe;
    }
  }

  if (include("profit_and_loss")) {
    sectionTitle("Profit and Loss");
    drawRow(
      [
        { text: "Metric", width: 270 },
        { text: "Amount", width: 240, align: "right" },
      ],
      { bold: true, shade: true },
    );
    drawRow(
      [
        { text: "Income Total", width: 270 },
        { text: formatAmount(bundle.profit_and_loss.income_total), width: 240, align: "right" },
      ],
      { shade: true },
    );
    drawRow(
      [
        { text: "Expense Total", width: 270 },
        { text: formatAmount(bundle.profit_and_loss.expense_total), width: 240, align: "right" },
      ],
    );
    drawRow(
      [
        { text: "Net Profit", width: 270 },
        { text: formatAmount(bundle.profit_and_loss.net_profit), width: 240, align: "right" },
      ],
      { bold: true, shade: true },
    );
  }

  if (include("cash_flow")) {
    sectionTitle("Cash Flow");
    drawText("Daily net movement for CASH and BANK accounts.", SMALL_SIZE);
    drawRow(
      [
        { text: "Date", width: 200, align: "center" },
        { text: "Net Movement", width: 310, align: "right" },
      ],
      { bold: true, shade: true },
    );
    let stripe = false;
    for (const row of bundle.cash_flow) {
      drawRow(
        [
          { text: row.date, width: 200, align: "center" },
          { text: formatAmount(row.net_change), width: 310, align: "right" },
        ],
        { shade: stripe },
      );
      stripe = !stripe;
    }
  }

  const pages = doc.getPages();
  const generatedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
  for (let i = 0; i < pages.length; i += 1) {
    const p = pages[i];
    p.drawLine({
      start: { x: PAGE_MARGIN, y: PAGE_MARGIN - 8 },
      end: { x: PAGE_WIDTH - PAGE_MARGIN, y: PAGE_MARGIN - 8 },
      thickness: 0.6,
      color: rgb(0.78, 0.78, 0.78),
    });
    p.drawText(`Generated: ${generatedAt}`, {
      x: PAGE_MARGIN,
      y: PAGE_MARGIN - 22,
      size: SMALL_SIZE,
      font: regular,
    });
    p.drawText(`Page ${i + 1} of ${pages.length}`, {
      x: PAGE_WIDTH - PAGE_MARGIN - 56,
      y: PAGE_MARGIN - 22,
      size: SMALL_SIZE,
      font: regular,
    });
  }

  const bytes = await doc.save();
  return Buffer.from(bytes);
}
