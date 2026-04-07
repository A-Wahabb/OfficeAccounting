import ExcelJS from "exceljs";

import type { ReportBundle } from "@/types/reporting";

export async function exportReportExcel(bundle: ReportBundle): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Office Accounting";

  const meta = wb.addWorksheet("Filters");
  meta.addRow(["From", bundle.filters.from]);
  meta.addRow(["To", bundle.filters.to]);
  meta.addRow(["Office ID", bundle.filters.office_id ?? ""]);
  meta.addRow(["Account ID", bundle.filters.account_id ?? ""]);

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

  const balSheet = wb.addWorksheet("Balances");
  balSheet.columns = [
    { header: "Office", key: "off", width: 10 },
    { header: "Account", key: "acc", width: 14 },
    { header: "Name", key: "nm", width: 28 },
    { header: "Type", key: "typ", width: 12 },
    { header: "Balance", key: "bal", width: 16 },
  ];
  for (const b of bundle.balances) {
    balSheet.addRow({
      off: b.office_code,
      acc: b.account_code,
      nm: b.account_name,
      typ: b.account_type,
      bal: b.balance,
    });
  }

  const cfSheet = wb.addWorksheet("Cash flow");
  cfSheet.columns = [
    { header: "Date", key: "d", width: 12 },
    { header: "Net change (CASH/BANK)", key: "n", width: 24 },
  ];
  for (const c of bundle.cash_flow) {
    cfSheet.addRow({ d: c.date, n: c.net_change });
  }

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
