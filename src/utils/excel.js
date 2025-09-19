export async function parseExcelBufferToJson(buffer) {
  // Load xlsx only when we actually need to parse a file
  const { default: XLSX } = await import("xlsx");
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(ws, { defval: "" });
}
