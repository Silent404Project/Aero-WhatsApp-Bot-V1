/** "5detik", "5 detik", "5s", "1500ms", "2menit", "1.5s" -> milidetik (atau null bila tidak valid). */
export function parseDuration(input) {
  const m = String(input || '').trim().toLowerCase().replace(',', '.').match(/^(\d+(?:\.\d+)?)\s*(ms|milidetik|detik|dtk|d|sec|s|menit|mnt|m)?$/);
  if (!m) return null;
  const n = parseFloat(m[1]);
  const unit = m[2] || 'detik';
  if (['ms', 'milidetik'].includes(unit)) return Math.round(n);
  if (['menit', 'mnt', 'm'].includes(unit)) return Math.round(n * 60_000);
  return Math.round(n * 1000);
}

export function formatDuration(ms) {
  if (ms < 1000) return `${ms} ms`;
  if (ms % 60_000 === 0) return `${ms / 60_000} menit`;
  return `${+(ms / 1000).toFixed(2)} detik`;
}
