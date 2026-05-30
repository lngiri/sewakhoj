/**
 * Exports data as a print-friendly report that the user can save as PDF.
 * Opens a new window with a styled report and triggers the browser's print dialog.
 */

import { escapeHtml } from "@/lib/escapeHtml";

interface ReportColumn {
  id: string;
  label: string;
}

interface ReportData {
  title: string;
  subtitle: string;
  stats: { label: string; value: string | number; color?: string }[];
  columns: ReportColumn[];
  rows: Record<string, any>[];
  generatedAt: Date;
  totalCount: number;
  filteredCount: number;
}

export function exportPdfReport(data: ReportData) {
  const { title, subtitle, stats, columns, rows, generatedAt, totalCount, filteredCount } = data;

  const statCards = stats
    .map(
      (s) => `
      <div class="stat-card">
        <div class="stat-value" style="color: ${s.color || '#C8102E'}">${s.value}</div>
        <div class="stat-label">${s.label}</div>
      </div>`
    )
    .join("");

  const headerRow = columns
    .map((col) => `<th>${escapeHtml(col.label)}</th>`)
    .join("");

  const bodyRows = rows
    .map(
      (row) =>
        `<tr>${columns
          .map((col) => {
            const val = row[col.id];
            const display = val == null ? "—" : String(val);
            return `<td>${escapeHtml(display)}</td>`;
          })
          .join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title} — Report</title>
  <style>
    @page { margin: 20mm 15mm; size: A4 landscape; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      color: #1a1a1a;
      background: #fff;
      padding: 40px;
    }
    .header {
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #C8102E;
    }
    .header h1 {
      font-size: 28px;
      font-weight: 800;
      color: #1a1a1a;
      letter-spacing: -0.5px;
    }
    .header .meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
    }
    .header .meta span {
      font-size: 12px;
      color: #666;
      font-weight: 600;
    }
    .header .subtitle {
      font-size: 14px;
      color: #666;
      margin-top: 4px;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 16px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: #f8f9fa;
      border-radius: 12px;
      padding: 16px 20px;
      border: 1px solid #eee;
    }
    .stat-value {
      font-size: 24px;
      font-weight: 800;
    }
    .stat-label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #888;
      margin-top: 4px;
    }
    .filters-info {
      font-size: 11px;
      color: #888;
      margin-bottom: 16px;
      font-weight: 600;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    thead th {
      background: #1a1a1a;
      color: #fff;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-size: 9px;
      padding: 10px 12px;
      text-align: left;
    }
    tbody td {
      padding: 8px 12px;
      border-bottom: 1px solid #eee;
      color: #333;
    }
    tbody tr:nth-child(even) {
      background: #f8f9fa;
    }
    tbody tr:hover {
      background: #f0f0f0;
    }
    .footer {
      margin-top: 30px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: #999;
      font-weight: 600;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .badge-success { background: #dcfce7; color: #166534; }
    .badge-danger { background: #fee2e2; color: #991b1b; }
    .badge-warning { background: #fef3c7; color: #92400e; }
    .badge-neutral { background: #f3f4f6; color: #6b7280; }
    .badge-info { background: #dbeafe; color: #1e40af; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
    .no-print {
      text-align: center;
      margin-bottom: 20px;
    }
    .no-print button {
      background: #C8102E;
      color: #fff;
      border: none;
      padding: 10px 24px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
    }
    .no-print button:hover {
      background: #a00d25;
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button onclick="window.print()">🖨️ Save as PDF / Print</button>
  </div>

  <div class="header">
    <h1>${escapeHtml(title)}</h1>
    <div class="subtitle">${escapeHtml(subtitle)}</div>
    <div class="meta">
      <span>Generated: ${generatedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })}</span>
      <span>Showing ${escapeHtml(String(filteredCount))} of ${escapeHtml(String(totalCount))} records</span>
    </div>
  </div>

  <div class="stats-grid">${statCards}</div>

  <div class="filters-info">
    Report contains ${escapeHtml(String(filteredCount))} entries.
  </div>

  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows || '<tr><td colspan="100%" style="text-align:center;padding:40px;color:#999">No records to display</td></tr>'}</tbody>
  </table>

  <div class="footer">
    <span>SewaKhoj Admin Report</span>
    <span>${escapeHtml(title)} — Confidential</span>
  </div>

  <script>
    // Auto-print after a short delay to ensure styles load
    setTimeout(() => { window.print(); }, 500);
  </script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");
  if (win) {
    win.onload = () => {
      URL.revokeObjectURL(url);
    };
  }
}
