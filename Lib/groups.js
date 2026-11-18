/** Bagi daftar grup menjadi section untuk tombol single_select (maks 10 baris/section, 100 grup). */
export function buildGroupSections(groups, rowId, { size = 10, max = 100 } = {}) {
  const shown = groups.slice(0, max);
  const sections = [];
  for (let i = 0; i < shown.length; i += size) {
    sections.push({
      title: `Grup ${i + 1}-${Math.min(i + size, shown.length)}`,
      rows: shown.slice(i, i + size).map((g, j) => ({
        title: String(g.subject || '(Tanpa nama)').slice(0, 24),
        description: `${g.size ?? g.participants?.length ?? '?'} anggota`,
        id: rowId(g, i + j)
      }))
    });
  }
  return sections;
}

/** "1,3,5-8" -> [1,3,5,6,7,8] (dibatasi 1..max). */
export function parseSelection(input, max) {
  const picked = new Set();
  for (const part of String(input || '').split(/[\s,]+/).filter(Boolean)) {
    const range = part.match(/^(\d+)-(\d+)$/);
    if (range) {
      for (let i = Number(range[1]); i <= Number(range[2]); i++) if (i >= 1 && i <= max) picked.add(i);
    } else if (/^\d+$/.test(part) && Number(part) >= 1 && Number(part) <= max) picked.add(Number(part));
  }
  return [...picked];
}

export const bySubject = (a, b) => String(a.subject).localeCompare(String(b.subject));
