import ExcelJS from 'exceljs';

export interface RawPerformer {
  name: string;
  pieces: string;
  composers: string;
  duration: number;
  orderPreference: number;
  introduction: string;
}

const REQUIRED_HEADERS = [
  { substring: 'Please select your name', field: 'name' },
  { substring: 'Are you going to be a performer or an audience', field: 'role' },
  { substring: 'What is the name of the piece', field: 'pieces' },
  { substring: 'Who is the composer', field: 'composers' },
  { substring: 'How long is the duration', field: 'duration' },
  { substring: 'which performing order would you prefer', field: 'orderPreference' },
  { substring: 'give a brief introduction', field: 'introduction' },
] as const;

const MAX_PERFORMERS = 200;

function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'richText' in value) {
    return (value as { richText: { text: string }[] }).richText.map((rt) => rt.text).join('');
  }
  return String(value ?? '');
}

// ExcelJS type definitions expect `Buffer` but Node.js 18+ defines it as
// `Buffer<ArrayBufferLike>` — a genuine type mismatch. `Buffer.from(ArrayBuffer)`
// produces a valid Buffer at runtime, so this @ts-ignore is safe.
export async function parseExcel(buffer: ArrayBuffer): Promise<RawPerformer[]> {
  const workbook = new ExcelJS.Workbook();
  // @ts-expect-error — ExcelJS Buffer type mismatch with Node.js 18+ (verified at runtime)
  await workbook.xlsx.load(Buffer.from(buffer));
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error('No worksheets found in the Excel file.');

  const headerMap = new Map<number, string>();
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell, colNumber) => {
    if (colNumber > 1) headerMap.set(colNumber, extractText(cell.value).trim());
  });

  const columnIndices = new Map<string, number>();
  for (const req of REQUIRED_HEADERS) {
    let found = false;
    for (const [colIndex, header] of headerMap) {
      if (header.toLowerCase().includes(req.substring.toLowerCase())) {
        columnIndices.set(req.field, colIndex);
        found = true;
        break;
      }
    }
    if (!found) throw new Error(`Column matching '${req.substring}' not found — has the Google Form been changed?`);
  }

  const performers: RawPerformer[] = [];
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const role = extractText(row.getCell(columnIndices.get('role')!).value).trim();
    if (role !== 'Performer') return;
    performers.push({
      name: extractText(row.getCell(columnIndices.get('name')!).value).trim(),
      pieces: extractText(row.getCell(columnIndices.get('pieces')!).value).trim(),
      composers: extractText(row.getCell(columnIndices.get('composers')!).value).trim(),
      duration: Number(extractText(row.getCell(columnIndices.get('duration')!).value)) || 0,
      orderPreference: Number(extractText(row.getCell(columnIndices.get('orderPreference')!).value)) || 0,
      introduction: extractText(row.getCell(columnIndices.get('introduction')!).value).trim(),
    });
  });

  if (performers.length > MAX_PERFORMERS) throw new Error('Too many rows — maximum 200 performers supported.');
  return performers;
}
