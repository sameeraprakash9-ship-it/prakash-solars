import { useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

const dashboardContent = {
  prosumer: {
    eyebrow: 'PROSUMER OVERVIEW',
    title: 'Your solar is making a difference.',
    description: 'See what your panels are producing and where your energy is going.',
    cards: [
      { label: 'Energy generated', value: '—', unit: 'kWh', note: 'Connect a meter to get started', tone: 'green' },
      { label: 'Available surplus', value: '—', unit: 'kWh', note: 'Ready to share locally', tone: 'lime' },
      { label: 'Total earned', value: '$—', unit: '', note: 'From settled energy trades', tone: 'white' }
    ]
  },
  consumer: {
    eyebrow: 'CONSUMER OVERVIEW',
    title: 'Good energy starts here.',
    description: 'Find local clean power and keep track of your energy purchases.',
    cards: [
      { label: 'Energy purchased', value: '—', unit: 'kWh', note: 'Your total traded energy', tone: 'green' },
      { label: 'Wallet balance', value: '$—', unit: '', note: 'Top up to start trading', tone: 'lime' },
      { label: 'Local offers', value: '—', unit: '', note: 'Available in your zone', tone: 'white' }
    ]
  },
  admin: {
    eyebrow: 'PLATFORM OVERVIEW',
    title: 'A clear view of the grid.',
    description: 'Monitor community activity and keep local energy flowing.',
    cards: [
      { label: 'Registered users', value: '—', unit: '', note: 'Across all community roles', tone: 'green' },
      { label: 'Energy traded', value: '—', unit: 'kWh', note: 'Settled transactions', tone: 'lime' },
      { label: 'Open disputes', value: '—', unit: '', note: 'Needs administrator review', tone: 'white' }
    ]
  }
};

const chartData = [
  { day: 'Mon', generation: 28, demand: 18 },
  { day: 'Tue', generation: 37, demand: 24 },
  { day: 'Wed', generation: 32, demand: 23 },
  { day: 'Thu', generation: 49, demand: 29 },
  { day: 'Fri', generation: 43, demand: 31 },
  { day: 'Sat', generation: 58, demand: 34 },
  { day: 'Sun', generation: 51, demand: 30 }
];

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [range, setRange] = useState('Last 7 days');
  const content = dashboardContent[user.role] || dashboardContent.consumer;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="border-b border-ink/5 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
          <a href="/" aria-label="SUN SOLAR home" className="flex items-center">
            <BrandLogo className="h-14 w-36" />
          </a>
          <div className="flex items-center gap-3 sm:gap-5">
            <span className="hidden rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold capitalize text-leaf sm:inline-flex">{user.role}</span>
            <span className="hidden text-sm font-semibold text-ink sm:inline">{user.name}</span>
            <button
              onClick={logout}
              className="rounded-xl border border-ink/10 px-3 py-2 text-xs font-bold text-ink transition hover:border-leaf hover:text-leaf"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">{content.eyebrow}</p>
            <h1 className="font-display text-3xl font-semibold tracking-[-0.045em] text-ink sm:text-4xl">{content.title}</h1>
            <p className="mt-2 text-sm text-muted">{content.description}</p>
          </div>
          <div className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-semibold text-ink">
            <span className="mr-2 inline-block h-2 w-2 rounded-full bg-lime" />
            {user.zone || 'Your energy zone'}
          </div>
        </div>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          {content.cards.map((card, index) => (
            <article
              key={card.label}
              className={`rounded-3xl p-6 shadow-card ${
                card.tone === 'green' ? 'bg-ink text-white' :
                  card.tone === 'lime' ? 'bg-lime text-ink' : 'bg-white text-ink'
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${card.tone === 'green' ? 'text-white/65' : 'text-muted'}`}>{card.label}</p>
                <span className={`grid h-8 w-8 place-items-center rounded-xl text-sm ${card.tone === 'green' ? 'bg-white/10' : 'bg-canvas'}`}>
                  {['↗', '⌁', '✦'][index]}
                </span>
              </div>
              <p className="mt-7 font-display text-4xl font-semibold tracking-tight">
                {card.value}<span className="ml-1 text-base font-medium opacity-65">{card.unit}</span>
              </p>
              <p className={`mt-2 text-xs ${card.tone === 'green' ? 'text-white/55' : 'text-muted'}`}>{card.note}</p>
            </article>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.7fr_1fr]">
          <article className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
              <div>
                <h2 className="font-display text-lg font-semibold text-ink">Energy in your community</h2>
                <p className="mt-1 text-xs text-muted">A sample view of generation and demand</p>
              </div>
              <select value={range} onChange={event => setRange(event.target.value)} className="rounded-xl border border-ink/10 bg-white px-3 py-2 text-xs font-semibold text-ink outline-none">
                <option>Last 7 days</option>
                <option>Last 30 days</option>
              </select>
            </div>
            <div className="mt-8 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                  <defs>
                    <linearGradient id="generationFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#17233b" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#17233b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="demandFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f2c866" stopOpacity={0.32} />
                      <stop offset="100%" stopColor="#f2c866" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#e8e4da" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 11 }} dy={10} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: '#687386', fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 14, border: '1px solid #e3dfd4', fontSize: 12 }} />
                  <Area type="monotone" dataKey="generation" stroke="#17233b" strokeWidth={2.5} fill="url(#generationFill)" />
                  <Area type="monotone" dataKey="demand" stroke="#b17b18" strokeWidth={2.5} fill="url(#demandFill)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 flex gap-5 text-xs font-medium text-muted">
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-leaf" />Generation</span>
              <span className="flex items-center gap-2"><i className="h-2 w-2 rounded-full bg-lime" />Demand</span>
            </div>
          </article>

          <article className="flex flex-col rounded-3xl bg-[#f0eadb] p-7 shadow-card sm:p-8">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-xl text-leaf">✳</div>
            <p className="mt-7 text-xs font-bold uppercase tracking-[0.16em] text-leaf">Your next bright step</p>
            <h2 className="mt-3 font-display text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink">
              {user.role === 'prosumer'
                ? 'Connect a meter and put your surplus to work.'
                : user.role === 'admin'
                  ? 'Explore reports to understand your energy network.'
                  : 'Browse local listings to find your next clean-energy match.'}
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Your dashboard is ready. As you connect with the platform, your real activity will appear here.
            </p>
            <div className="mt-auto pt-8">
              <div className="h-px bg-ink/10" />
              <p className="mt-4 text-xs font-semibold text-ink">Small choices. A brighter grid.</p>
            </div>
          </article>
        </section>
        <p className="mt-8 text-center text-[11px] text-muted">Sunwise energy community · Making local power count</p>
      </main>
    </div>
  );
}
