import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-5">
      <section className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-card sm:p-12">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lime text-2xl text-ink">?</span>
        <p className="mt-6 text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">404 · PAGE NOT FOUND</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink">This page isn’t in our grid.</h1>
        <p className="mt-3 text-sm leading-6 text-muted">The link may be outdated, or the page may have moved.</p>
        <Link to="/" className="mt-7 inline-flex rounded-xl bg-leaf px-5 py-3 text-sm font-bold text-white hover:bg-ink">Back to Sunwise</Link>
      </section>
    </main>
  );
}
