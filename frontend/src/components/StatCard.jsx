export default function StatCard({ label, value, unit = '', note, tone = 'white', icon = '↗' }) {
  const toneClass = {
    dark: 'bg-ink text-white',
    lime: 'bg-lime text-ink',
    white: 'bg-white text-ink'
  }[tone] || 'bg-white text-ink';

  return (
    <article className={`rounded-3xl p-6 shadow-card ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className={`text-sm font-medium ${tone === 'dark' ? 'text-white/65' : 'text-muted'}`}>{label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm ${tone === 'dark' ? 'bg-white/10' : 'bg-canvas'}`}>
          {icon}
        </span>
      </div>
      <p className="mt-7 font-display text-4xl font-semibold tracking-tight">
        {value}<span className="ml-1 text-base font-medium opacity-65">{unit}</span>
      </p>
      {note && <p className={`mt-2 text-xs ${tone === 'dark' ? 'text-white/55' : 'text-muted'}`}>{note}</p>}
    </article>
  );
}
