export default function Loader({ label = 'Loading…', compact = false }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-sm font-medium text-muted ${compact ? 'py-6' : 'min-h-48'}`} role="status">
      <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-leaf" />
      {label}
    </div>
  );
}
