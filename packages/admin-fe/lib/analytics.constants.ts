// Canonical analytics fallback values shared across admin analytics components
export const DUMMY_7DAY = [
  { registered: 12, resolved: 5 },
  { registered: 18, resolved: 9 },
  { registered: 15, resolved: 11 },
  { registered: 22, resolved: 16 },
  { registered: 19, resolved: 17 },
  { registered: 25, resolved: 22 },
  { registered: 28, resolved: 26 },
]

export const STATUS_DISTRIBUTION = [
  { name: "COMPLETED", value: 156, color: "#22c55e" },
  { name: "UNDER PROCESSING", value: 42, color: "#f59e0b" },
  { name: "REGISTERED", value: 28, color: "#3b82f6" },
  { name: "FORWARDED", value: 18, color: "#8b5cf6" },
  { name: "ON HOLD", value: 8, color: "#6b7280" },
  { name: "ESCALATED", value: 5, color: "#06b6d4" },
]

export const TOTAL_COMPLAINTS_FALLBACK = 257
export const SOLVED_COMPLAINTS_FALLBACK = 156
export const ESCALATED_COMPLAINTS_FALLBACK = 5

export default {
  DUMMY_7DAY,
  STATUS_DISTRIBUTION,
  TOTAL_COMPLAINTS_FALLBACK,
  SOLVED_COMPLAINTS_FALLBACK,
  ESCALATED_COMPLAINTS_FALLBACK,
}
