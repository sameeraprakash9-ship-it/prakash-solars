import { Link } from 'react-router-dom';
import BrandLogo from './BrandLogo';
import { solarPanelsImageUrl } from '../utils/images';

export default function AuthLayout({ children, mode }) {
  const content = {
    login: {
      eyebrow: 'Welcome back',
      title: 'Sign in to Sunwise',
      description: 'Your community’s clean-energy story is right where you left it.'
    },
    register: {
      eyebrow: 'Start your energy journey',
      title: 'Create your account',
      description: 'Join your local clean-energy community in just a moment.'
    },
    forgot: {
      eyebrow: 'Account recovery',
      title: 'Reset your password',
      description: 'Enter the email address on your account and we’ll send you a reset link.'
    },
    reset: {
      eyebrow: 'Choose a new password',
      title: 'Create a new password',
      description: 'Choose a password with at least 6 characters.'
    }
  }[mode] || {
    eyebrow: 'Welcome back',
    title: 'Sign in to Sunwise',
    description: 'Your community’s clean-energy story is right where you left it.'
  };

  return (
    <main className="min-h-screen bg-canvas p-4 sm:p-6 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-7xl overflow-hidden rounded-[2rem] bg-white shadow-card lg:grid-cols-[1.04fr_.96fr]">
        <section className="relative hidden overflow-hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between xl:p-16">
          {mode === 'login' && (
            <>
              <img
                src={solarPanelsImageUrl}
                alt=""
                aria-hidden="true"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/65 to-leaf/70" />
            </>
          )}
          <div className="absolute -right-32 -top-28 h-96 w-96 rounded-full border border-white/10" />
          <div className="absolute -right-10 -top-6 h-72 w-72 rounded-full border border-white/10" />
          <div className="absolute -bottom-52 -left-32 h-[34rem] w-[34rem] rounded-full bg-leaf/40 blur-3xl" />
          <Link to="/" aria-label="SUN SOLAR home" className="relative z-10 flex items-center">
            <BrandLogo className="h-16 w-40" />
          </Link>

          <div className="relative z-10 max-w-lg py-14">
            <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-lime">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              LOCAL ENERGY. SHARED BRIGHTER.
            </div>
            <h1 className="font-display text-5xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-6xl">
              A brighter way to share <span className="text-lime">clean energy.</span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-white/65">
              Connect your community to the power already shining around you.
              Trade surplus solar, track your impact, and keep energy local.
            </p>
            <div className="mt-11 flex items-center gap-4">
              <div className="flex -space-x-2">
                {['#d4a56a', '#8bb4a0', '#c5815c', '#7894a8'].map((color, index) => (
                  <span
                    key={color}
                    className="grid h-9 w-9 place-items-center rounded-full border-2 border-ink text-[10px] font-bold text-ink"
                    style={{ background: color }}
                  >
                    {['M', 'J', 'A', 'S'][index]}
                  </span>
                ))}
              </div>
              <p className="text-xs text-white/60">
                <span className="font-semibold text-white">Good energy, together.</span>
                <br />Built for everyday communities.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-[11px] text-white/40">
            <span>© 2025 Sunwise Energy</span>
            <span>Power in your hands ↗</span>
          </div>
        </section>

        <section className="flex items-center justify-center px-5 py-9 sm:px-12 lg:px-14 xl:px-20">
          <div className="w-full max-w-md">
            {mode === 'login' ? (
              <div className="relative mb-8 h-36 overflow-hidden rounded-2xl bg-ink lg:hidden">
                <img
                  src={solarPanelsImageUrl}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-br from-ink/85 via-ink/55 to-leaf/60" />
                <Link to="/" aria-label="SUN SOLAR home" className="absolute left-3 top-3 z-10">
                  <BrandLogo className="h-11 w-28" />
                </Link>
                <p className="absolute bottom-4 left-4 z-10 text-[10px] font-bold uppercase tracking-[0.16em] text-lime">
                  LOCAL ENERGY. SHARED BRIGHTER.
                </p>
              </div>
            ) : (
              <div className="mb-10 flex lg:hidden">
                <Link to="/" aria-label="SUN SOLAR home">
                  <BrandLogo className="h-14 w-36" />
                </Link>
              </div>
            )}
            <div className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-leaf">
                {content.eyebrow}
              </p>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.04em] text-ink sm:text-4xl">
                {content.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {content.description}
              </p>
            </div>
            {children}
            <p className="mt-8 text-center text-xs leading-5 text-muted">
              By continuing, you agree to our <span className="font-semibold text-ink">Terms</span> and <span className="font-semibold text-ink">Privacy Policy</span>.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
