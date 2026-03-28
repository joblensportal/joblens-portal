/**
 * Formats annual CTC in INR for job listings.
 * Uses Indian numbering (Lakh / Crore) instead of broken "k" abbreviations.
 *
 * Examples:
 *   50_000     → ₹50,000
 *   990_000    → ₹9.9 L
 *   1_000_000  → ₹10 L
 *   15_00_000  → ₹15 L
 *   1_00_00_000 → ₹1 Cr
 */
export function formatSalaryCTC(amount) {
  const n = Number(amount)
  if (!Number.isFinite(n)) {
    return amount != null && amount !== '' ? String(amount) : '—'
  }
  if (n < 0) {
    return `₹${n.toLocaleString('en-IN')}`
  }

  // Below 1 Lakh: show full amount with Indian grouping
  if (n < 100000) {
    return `₹${n.toLocaleString('en-IN')}`
  }

  // 1 Lakh to just below 1 Crore
  if (n < 10000000) {
    const lakhs = n / 100000
    const label =
      lakhs % 1 === 0
        ? lakhs.toFixed(0)
        : lakhs.toFixed(1).replace(/\.0$/, '')
    return `₹${label} L`
  }

  // 1 Crore and above
  const cr = n / 10000000
  const label =
    cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2).replace(/\.?0+$/, '')
  return `₹${label} Cr`
}
