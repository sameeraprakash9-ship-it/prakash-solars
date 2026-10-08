import { solarPanelsImageUrl } from '../utils/images';

export default function DashboardHero({ eyebrow, title, description, children }) {
  return (
    <section className="relative isolate flex min-h-[15rem] flex-col justify-between gap-5 overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-card sm:min-h-[17rem] sm:flex-row sm:items-end sm:p-8">
      <img
        src={solarPanelsImageUrl}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/90 via-ink/70 to-ink/30" />
      <div className="relative z-10 max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime">{eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl font-semibold tracking-tight text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/75">{description}</p>
      </div>
      {children && <div className="relative z-10 flex flex-wrap gap-2">{children}</div>}
    </section>
  );
}
