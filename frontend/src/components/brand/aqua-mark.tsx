export function AquaMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="currentColor" opacity="0.12" />
      <circle cx="16" cy="16" r="10.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M16 7.5v4.2M16 20.3v4.2M7.5 16h4.2M20.3 16h4.2"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2.1" fill="currentColor" />
      <path
        d="M16 16 L23.2 11.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
