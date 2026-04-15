export default function AppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="8" fill="currentColor" />
      <path
        d="M20.5 8v11a3.5 3.5 0 1 1-2-3.16V11.5L13 12.75v7.75a3.5 3.5 0 1 1-2-3.16V10l9.5-2z"
        fill="black"
      />
    </svg>
  );
}
