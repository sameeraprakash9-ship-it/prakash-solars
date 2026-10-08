export default function ChartCard({ title, description, action, children, className = '' }) {
  return (
    <article className={`rounded-3xl bg-white p-6 shadow-card sm:p-8 ${className}`}>
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
        <div>
          <h2 className="font-display text-lg font-semibold text-ink">{title}</h2>
          {description && <p className="mt-1 text-xs text-muted">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}
