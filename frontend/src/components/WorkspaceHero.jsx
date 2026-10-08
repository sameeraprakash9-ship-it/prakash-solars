const artwork = {
  bid: (
    <>
      <path d="M25 95 58 76l34 19v29H25z" fill="#17233b" />
      <path d="m34 95 23-13 24 13v19H34z" fill="#f2c866" />
      <path d="M45 94v18m13-25v25m13-18v18M34 101h47" stroke="#17233b" strokeWidth="2" />
      <rect x="102" y="33" width="55" height="65" rx="9" fill="white" />
      <path d="M114 50h30m-30 11h22m-22 11h26" stroke="#687386" strokeWidth="4" strokeLinecap="round" />
      <circle cx="143" cy="96" r="18" fill="#f2c866" stroke="white" strokeWidth="5" />
      <path d="M143 86v20m-6-15h9a4 4 0 0 1 0 8h-7a4 4 0 0 0 0 8h10" fill="none" stroke="#17233b" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  match: (
    <>
      <path d="M47 57 91 86l43-34M48 111l43-25 43 25" fill="none" stroke="#b7a57e" strokeWidth="4" strokeDasharray="5 6" />
      <circle cx="47" cy="57" r="20" fill="white" />
      <circle cx="47" cy="57" r="9" fill="#f2c866" />
      <circle cx="134" cy="52" r="20" fill="white" />
      <path d="M134 41v22m-7-15h10a4 4 0 0 1 0 8h-7a4 4 0 0 0 0 8h11" fill="none" stroke="#93620a" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="47" cy="111" r="14" fill="#17233b" />
      <path d="m41 111 4 4 8-9" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="134" cy="111" r="14" fill="#f2c866" />
      <path d="m128 111 4 4 8-9" fill="none" stroke="#17233b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="91" cy="86" r="13" fill="#17233b" stroke="white" strokeWidth="4" />
      <path d="M87 86h8m-4-4v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </>
  ),
  wallet: (
    <>
      <rect x="31" y="49" width="120" height="76" rx="13" fill="#17233b" />
      <path d="M42 62h98" stroke="white" strokeOpacity=".24" strokeWidth="2" />
      <rect x="98" y="75" width="62" height="34" rx="9" fill="#f2c866" stroke="white" strokeWidth="4" />
      <circle cx="117" cy="92" r="4" fill="#17233b" />
      <path d="M49 92h28m-28 12h18" stroke="white" strokeOpacity=".8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="139" cy="47" r="19" fill="white" />
      <path d="M139 36v22m-7-15h10a4 4 0 0 1 0 8h-7a4 4 0 0 0 0 8h11" fill="none" stroke="#93620a" strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),
  transaction: (
    <>
      <path d="M52 31h79v99l-10-7-10 7-10-7-10 7-10-7-10 7-10-7-9 7z" fill="white" />
      <path d="M68 51h45m-45 13h36m-36 13h43" stroke="#aab7ae" strokeWidth="4" strokeLinecap="round" />
      <rect x="68" y="91" width="47" height="21" rx="6" fill="#f2c866" />
      <path d="m78 101 5 5 11-12" fill="none" stroke="#93620a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  dispute: (
    <>
      <path d="M91 29 139 47v32c0 27-20 46-48 60-28-14-48-33-48-60V47z" fill="white" />
      <path d="M91 41 127 54v25c0 20-14 34-36 46-22-12-36-26-36-46V54z" fill="#f0eadb" />
      <path d="M91 59v25m0 12v1" stroke="#93620a" strokeWidth="7" strokeLinecap="round" />
      <circle cx="137" cy="105" r="20" fill="#f2c866" stroke="white" strokeWidth="5" />
      <path d="m128 105 6 6 12-13" fill="none" stroke="#17233b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  certificate: (
    <>
      <rect x="39" y="32" width="105" height="105" rx="8" fill="white" />
      <rect x="48" y="41" width="87" height="87" rx="4" fill="#fcfbf8" stroke="#f2c866" strokeWidth="3" />
      <path d="M63 57h57m-57 10h45" stroke="#9baa9f" strokeWidth="3" strokeLinecap="round" />
      <path d="M68 84h47m-47 8h37" stroke="#d4ddd6" strokeWidth="3" strokeLinecap="round" />
      <circle cx="112" cy="108" r="14" fill="#f2c866" stroke="white" strokeWidth="3" />
      <path d="m105 108 5 5 9-10" fill="none" stroke="#93620a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m102 120-3 19 13-8 13 8-3-19" fill="#17233b" />
    </>
  ),
  notification: (
    <>
      <path d="M60 108h64l-9-12V71a23 23 0 0 0-46 0v25z" fill="white" />
      <path d="M79 117a13 13 0 0 0 26 0" fill="#f2c866" />
      <circle cx="123" cy="54" r="16" fill="#f2c866" stroke="white" strokeWidth="4" />
      <path d="M123 46v9m0 6v1" stroke="#17233b" strokeWidth="3" strokeLinecap="round" />
      <path d="M48 57h-9m101 0h9M91 34v-9" stroke="#b7a57e" strokeWidth="3" strokeLinecap="round" />
    </>
  )
};

export default function WorkspaceHero({ variant, eyebrow, title, description, children }) {
  return (
    <section className="relative isolate flex min-h-44 flex-col justify-between gap-4 overflow-hidden rounded-3xl bg-ink p-6 text-white shadow-card sm:flex-row sm:items-center sm:p-8">
      <div className="absolute inset-0 bg-gradient-to-r from-ink via-ink to-leaf/80" />
      <div className="relative z-10 max-w-2xl">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-lime">{eyebrow}</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/70">{description}</p>
        {children && <div className="mt-5 flex flex-wrap gap-2">{children}</div>}
      </div>
      <div className="pointer-events-none absolute -right-3 -top-4 h-44 w-52 opacity-95 sm:relative sm:right-auto sm:top-auto sm:h-40 sm:w-48 sm:shrink-0">
        <svg viewBox="0 0 182 160" className="h-full w-full" aria-hidden="true">
          <circle cx="91" cy="80" r="69" fill="white" fillOpacity=".07" />
          <circle cx="91" cy="80" r="53" fill="white" fillOpacity=".05" />
          {artwork[variant] || artwork.match}
        </svg>
      </div>
    </section>
  );
}
