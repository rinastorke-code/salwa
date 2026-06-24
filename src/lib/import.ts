import * as XLSX from 'xlsx';

// ---------------------------------------------------------------------
// Digit normalization: Arabic-Indic (٠-٩) and Persian (۰-۹) -> Latin
// ---------------------------------------------------------------------
const DIGIT_MAP: Record<string, string> = {};
'٠١٢٣٤٥٦٧٨٩'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i)));
'۰۱۲۳۴۵۶۷۸۹'.split('').forEach((d, i) => (DIGIT_MAP[d] = String(i)));

export function normalizeDigits(s: string): string {
  return s.replace(/[٠-٩۰-۹]/g, (d) => DIGIT_MAP[d] ?? d);
}

export function normalizeNationalId(v: unknown): string {
  return normalizeDigits(String(v ?? ''))
    .replace(/[^\d]/g, '')   // keep digits only (drops spaces, dashes, NBSP)
    .trim();
}

export function normalizeText(v: unknown): string {
  return String(v ?? '')
    .replace(/[\u200f\u200e\u00a0]/g, ' ') // RTL/LTR marks, NBSP
    .replace(/\s+/g, ' ')
    .trim();
}

// ---------------------------------------------------------------------
// Header mapping — tolerant to Arabic / English variants
// ---------------------------------------------------------------------
const HEADER_ALIASES: Record<string, string[]> = {
  full_name:   ['full_name', 'name', 'الاسم', 'الاسم الكامل', 'اسم الموظف', 'الاسم الثلاثي'],
  national_id: ['national_id', 'nid', 'الرقم الوطني', 'الرقم_الوطني', 'رقم وطني', 'الرقم الوطنى'],
  location:    ['location', 'المركز', 'الدائرة', 'القسم', 'الموقع', 'مكان العمل', 'الجهة'],
  hire_date:   ['hire_date', 'تاريخ التعيين', 'التعيين', 'تاريخ المباشرة'],
  entitlement: ['annual_entitlement', 'الرصيد', 'رصيد الإجازات', 'الرصيد السنوي'],
  job_title:   ['job_title', 'المسمى', 'المسمى الوظيفي', 'الوظيفة', 'الصفة'],
  phone:       ['phone', 'الهاتف', 'الموبايل', 'رقم الهاتف', 'الجوال'],
};

function buildHeaderMap(headers: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  headers.forEach((h) => {
    const key = normalizeText(h).toLowerCase();
    for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
      if (aliases.some((a) => normalizeText(a).toLowerCase() === key)) { map[h] = field; break; }
    }
  });
  return map;
}

export type ParsedRow = {
  full_name: string;
  national_id: string;
  location_name: string | null;
  hire_date: string | null;
  annual_entitlement: number;
  job_title: string | null;
  phone: string | null;
};

export type ParseResult = {
  rows: ParsedRow[];
  errors: { row: number; reason: string }[];
  locationNames: string[];
  unmappedHeaders: string[];
};

function toDate(v: unknown): string | null {
  if (v == null || v === '') return null;
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  // Excel serial number (epoch = 1899-12-30; works without SSF)
  if (typeof v === 'number' && v > 0 && v < 80000) {
    const ms = Math.round((v - 25569) * 86400 * 1000); // 25569 = days from 1970 to 1900 epoch
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = normalizeDigits(String(v)).replace(/[.\\]/g, '-').trim();
  const m = s.match(/^(\d{1,4})-(\d{1,2})-(\d{1,4})$/);
  if (m) {
    const [a, b, c] = [m[1], m[2], m[3]];
    const yyyy = a.length === 4 ? a : c.length === 4 ? c : a; // day-first or year-first
    const dd = a.length === 4 ? c : a;
    return `${yyyy}-${b.padStart(2, '0')}-${dd.padStart(2, '0')}`;
  }
  return null;
}

export function parseWorkbook(buf: Buffer): ParseResult {
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const headers = raw.length ? Object.keys(raw[0]) : [];
  const hmap = buildHeaderMap(headers);
  const unmappedHeaders = headers.filter((h) => !hmap[h]);

  const rows: ParsedRow[] = [];
  const errors: { row: number; reason: string }[] = [];
  const seen = new Set<string>();
  const locationNames = new Set<string>();

  raw.forEach((r, i) => {
    const rowNum = i + 2; // header is row 1
    const get = (field: string) => {
      const h = Object.keys(hmap).find((k) => hmap[k] === field);
      return h ? r[h] : null;
    };

    const full_name = normalizeText(get('full_name'));
    const national_id = normalizeNationalId(get('national_id'));
    const location_name = normalizeText(get('location')) || null;

    if (!full_name && !national_id) return; // blank line, ignore silently
    if (!full_name) { errors.push({ row: rowNum, reason: 'الاسم مفقود' }); return; }
    if (!national_id) { errors.push({ row: rowNum, reason: 'الرقم الوطني مفقود' }); return; }
    if (national_id.length !== 11) {
      errors.push({ row: rowNum, reason: `الرقم الوطني غير صالح (${national_id.length} خانة)` });
      return;
    }
    if (seen.has(national_id)) { errors.push({ row: rowNum, reason: 'مكرر داخل الملف' }); return; }
    seen.add(national_id);
    if (location_name) locationNames.add(location_name);

    const entRaw = get('entitlement');
    const ent = Number(normalizeDigits(String(entRaw ?? '')));
    rows.push({
      full_name,
      national_id,
      location_name,
      hire_date: toDate(get('hire_date')),
      annual_entitlement: Number.isFinite(ent) && ent > 0 ? ent : 30,
      job_title: normalizeText(get('job_title')) || null,
      phone: normalizeText(get('phone')) || null,
    });
  });

  return { rows, errors, locationNames: [...locationNames], unmappedHeaders };
}
