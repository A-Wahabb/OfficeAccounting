import ExcelJS from "exceljs";

import type { ReportBundle } from "@/types/reporting";

function shouldInclude(
  selected: ReportBundle["filters"]["report_type"],
  key: Exclude<ReportBundle["filters"]["report_type"], "all">,
): boolean {
  return selected === "all" || selected === key;
}

export async function exportReportExcel(bundle: ReportBundle): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Office Accounting";

  const meta = wb.addWorksheet("Filters");
  meta.addRow(["From", bundle.filters.from]);
  meta.addRow(["To", bundle.filters.to]);
  meta.addRow(["Office ID", bundle.filters.office_id ?? ""]);
  meta.addRow(["Account ID", bundle.filters.account_id ?? ""]);
  meta.addRow(["Report Type", bundle.filters.report_type]);

  if (
    shouldInclude(bundle.filters.report_type, "general_ledger") ||
    bundle.filters.report_type === "all"
  ) {
    const txSheet = wb.addWorksheet("Transactions");
    txSheet.columns = [
      { header: "Txn #", key: "num", width: 16 },
      { header: "Date", key: "date", width: 12 },
      { header: "Office", key: "off", width: 10 },
      { header: "Type", key: "typ", width: 12 },
      { header: "Currency", key: "cur", width: 8 },
      { header: "Line", key: "ln", width: 6 },
      { header: "Account", key: "acc", width: 14 },
      { header: "Account name", key: "accn", width: 28 },
      { header: "Debit", key: "db", width: 14 },
      { header: "Credit", key: "cr", width: 14 },
      { header: "Description", key: "desc", width: 36 },
    ];

    for (const t of bundle.transactions) {
      if (t.lines.length === 0) {
        txSheet.addRow({
          num: t.transaction_number,
          date: t.transaction_date,
          off: t.office_code,
          typ: t.type,
          cur: t.currency,
          ln: "",
          acc: "",
          accn: "",
          db: "",
          cr: "",
          desc: t.description ?? "",
        });
        continue;
      }
      for (const line of t.lines) {
        txSheet.addRow({
          num: t.transaction_number,
          date: t.transaction_date,
          off: t.office_code,
          typ: t.type,
          cur: t.currency,
          ln: line.line_number,
          acc: line.account_code,
          accn: line.account_name,
          db: line.debit,
          cr: line.credit,
          desc: t.description ?? "",
        });
      }
    }
  }

  if (shouldInclude(bundle.filters.report_type, "trial_balance")) {
    const trialSheet = wb.addWorksheet("Trial balance");
    trialSheet.columns = [
      { header: "Office", key: "off", width: 10 },
      { header: "Account", key: "acc", width: 14 },
      { header: "Name", key: "nm", width: 28 },
      { header: "Type", key: "typ", width: 12 },
      { header: "Debit total", key: "db", width: 16 },
      { header: "Credit total", key: "cr", width: 16 },
      { header: "Net", key: "net", width: 16 },
    ];
    for (const row of bundle.trial_balance) {
      trialSheet.addRow({
        off: row.office_code,
        acc: row.account_code,
        nm: row.account_name,
        typ: row.account_type,
        db: row.debit_total,
        cr: row.credit_total,
        net: row.net_balance,
      });
    }
  }

  if (shouldInclude(bundle.filters.report_type, "headwise_expense")) {
    const expenseSheet = wb.addWorksheet("Headwise expense");
    expenseSheet.columns = [
      { header: "Office", key: "off", width: 10 },
      { header: "Account", key: "acc", width: 14 },
      { header: "Name", key: "nm", width: 28 },
      { header: "Expense total", key: "amt", width: 18 },
    ];
    for (const row of bundle.headwise_expense) {
      expenseSheet.addRow({
        off: row.office_code,
        acc: row.account_code,
        nm: row.account_name,
        amt: row.expense_total,
      });
    }
  }

  if (shouldInclude(bundle.filters.report_type, "reconciliation")) {
    const recSheet = wb.addWorksheet("Reconciliation");
    recSheet.columns = [
      { header: "Office", key: "off", width: 10 },
      { header: "Account", key: "acc", width: 14 },
      { header: "Name", key: "nm", width: 28 },
      { header: "Type", key: "typ", width: 10 },
      { header: "Ledger balance", key: "led", width: 16 },
      { header: "Statement amount", key: "st", width: 18 },
      { header: "Difference", key: "diff", width: 14 },
      { header: "Status", key: "status", width: 20 },
    ];
    for (const row of bundle.reconciliation) {
      recSheet.addRow({
        off: row.office_code,
        acc: row.account_code,
        nm: row.account_name,
        typ: row.account_type,
        led: row.ledger_balance,
        st: row.statement_amount ?? "",
        diff: row.difference ?? "",
        status: row.status,
      });
    }
  }

  if (shouldInclude(bundle.filters.report_type, "general_ledger")) {
    const glSheet = wb.addWorksheet("General ledger");
    glSheet.columns = [
      { header: "Date", key: "date", width: 12 },
      { header: "Txn #", key: "txn", width: 16 },
      { header: "Office", key: "off", width: 10 },
      { header: "Account", key: "acc", width: 14 },
      { header: "Name", key: "nm", width: 28 },
      { header: "Debit", key: "db", width: 14 },
      { header: "Credit", key: "cr", width: 14 },
      { header: "Running balance", key: "rb", width: 18 },
    ];
    for (const row of bundle.general_ledger) {
      glSheet.addRow({
        date: row.date,
        txn: row.transaction_number,
        off: row.office_code,
        acc: row.account_code,
        nm: row.account_name,
        db: row.debit,
        cr: row.credit,
        rb: row.running_balance,
      });
    }
  }

  if (shouldInclude(bundle.filters.report_type, "profit_and_loss")) {
    const pnlSheet = wb.addWorksheet("Profit and loss");
    pnlSheet.columns = [
      { header: "Metric", key: "metric", width: 24 },
      { header: "Amount", key: "amt", width: 16 },
    ];
    pnlSheet.addRow({ metric: "Income total", amt: bundle.profit_and_loss.income_total });
    pnlSheet.addRow({ metric: "Expense total", amt: bundle.profit_and_loss.expense_total });
    pnlSheet.addRow({ metric: "Net profit", amt: bundle.profit_and_loss.net_profit });
  }

  if (shouldInclude(bundle.filters.report_type, "cash_flow")) {
    const cfSheet = wb.addWorksheet("Cash flow");
    cfSheet.columns = [
      { header: "Date", key: "d", width: 12 },
      { header: "Net change (CASH/BANK)", key: "n", width: 24 },
    ];
    for (const c of bundle.cash_flow) {
      cfSheet.addRow({ d: c.date, n: c.net_change });
    }
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
