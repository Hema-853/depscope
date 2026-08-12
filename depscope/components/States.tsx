export function LoadingRows({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="h-16 rounded-node border border-hairline bg-surface animate-pulse"
        />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}

export function EmptyState({
  title,
  hint,
}: {
  title: string;
  hint?: string;
}) {
  return (
    <div className="border border-dashed border-hairline rounded-node p-10 text-center">
      <p className="font-mono text-sm text-muted">{title}</p>
      {hint && <p className="text-xs text-faint mt-2">{hint}</p>}
    </div>
  );
}

export function ErrorState({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div className="border border-critical/30 bg-critical/5 rounded-node p-6">
      <p className="font-mono text-sm text-critical">
        Couldn&apos;t load this.
      </p>
      <p className="text-xs text-muted mt-2">{message}</p>
      {hint && <p className="text-xs text-faint mt-2">{hint}</p>}
    </div>
  );
}
