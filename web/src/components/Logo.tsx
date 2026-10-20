/** Mood Ring mark: a band with a stone. Single colour, inherits currentColor. */
export function Logo({ size = 22 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="19" r="9.5" fill="none" stroke="currentColor" strokeWidth="3.5" />
      <circle cx="16" cy="7.5" r="5.5" fill="currentColor" />
    </svg>
  )
}
