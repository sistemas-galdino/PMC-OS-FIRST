export type CSVColumn<T = Record<string, unknown>> = {
  key: string
  label: string
  format?: (row: T) => unknown
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) return ""
  if (typeof value === "boolean") return value ? "Sim" : "Não"
  if (Array.isArray(value)) return value.map((v) => (v === null || v === undefined ? "" : String(v))).join("; ")
  if (value instanceof Date) return value.toISOString()
  return String(value)
}

function escapeCell(raw: string): string {
  if (raw === "") return ""
  if (/[",\r\n]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`
  return raw
}

export function rowsToCSV<T extends object>(
  rows: T[],
  columns: CSVColumn<T>[],
): string {
  const header = columns.map((c) => escapeCell(c.label)).join(",")
  const lines = rows.map((row) =>
    columns
      .map((col) => {
        const raw = col.format ? col.format(row) : (row as Record<string, unknown>)[col.key]
        return escapeCell(formatCell(raw))
      })
      .join(","),
  )
  return [header, ...lines].join("\r\n")
}

export function downloadCSV<T extends object>(
  filename: string,
  rows: T[],
  columns: CSVColumn<T>[],
): void {
  const csv = rowsToCSV(rows, columns)
  const BOM = "﻿"
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
