import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DashboardHero from '../components/DashboardHero';
import ErrorMessage from '../components/ErrorMessage';
import Loader from '../components/Loader';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const pageSize = 10;
const toLocalInput = value => {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const localDateTime = (date) => toLocalInput(date);
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
const initialBid = {
  quantityKwh: '',
  maxPricePerKwh: '',
  windowStart: localDateTime(tomorrow),
  windowEnd: localDateTime(new Date(tomorrow.getTime() + 60 * 60 * 1000))
};

function SolarPanelArtwork() {
  return (
    <svg viewBox="0 0 480 260" role="img" aria-label="Illustration of a solar panel system" className="h-full w-full">
      <defs>
        <linearGradient id="solar-sky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#f7f2e5" />
          <stop offset="100%" stopColor="#eee4ca" />
        </linearGradient>
        <linearGradient id="solar-panel" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#253956" />
          <stop offset="100%" stopColor="#17233b" />
        </linearGradient>
      </defs>
      <rect width="480" height="260" fill="url(#solar-sky)" />
      <circle cx="365" cy="66" r="28" fill="#f2c866" />
      <path d="M0 198c92-40 165-36 254-5 94 33 152 16 226-7v74H0z" fill="#d9ceb0" />
      <path d="M0 222c103-30 192-11 278 16 77 24 136 13 202-10v32H0z" fill="#c4b58f" />
      <g transform="translate(85 80) skewX(-18)">
        <rect x="0" y="0" width="220" height="113" rx="5" fill="url(#solar-panel)" stroke="#fff" strokeWidth="5" />
        <path d="M55 3v106M110 3v106M165 3v106M3 38h214M3 75h214" stroke="#dce4ec" strokeOpacity=".72" strokeWidth="2" />
        <path d="M38 116l-8 46m151-46 8 46m-173 0h196" stroke="#687386" strokeWidth="6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function SolarOfferCard({ listing, onPlaceBid }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const meter = listing.meter || {};
  const totalValue = Number(listing.remainingKwh) * Number(listing.askPricePerKwh);
  const photoUrl = meter.solarPhotoContentType
    ? `${import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000/api'}/listings/${listing._id}/photo`
    : null;
  const hasPhoto = Boolean(photoUrl) && !photoFailed;

  return (
    <article className="overflow-hidden rounded-3xl border border-ink/5 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lg">
      <div className="relative h-52 overflow-hidden bg-[#f0eadb]">
        <SolarPanelArtwork />
        {hasPhoto && (
          <img
            src={photoUrl}
            alt={`Solar panels listed by ${listing.seller?.name || 'a community seller'}`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setPhotoFailed(true)}
          />
        )}
        <span className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1.5 text-[11px] font-bold text-ink shadow">
          {hasPhoto ? 'Seller-provided panel photo' : 'Illustration · not a seller photo'}
        </span>
        <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
          {meter.isDemo && (
            <span className="rounded-full bg-amber-300 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-amber-950">
              Demo only · simulated
            </span>
          )}
          <span className="rounded-full bg-ink/90 px-3 py-1.5 text-[11px] font-bold capitalize text-white">
            {listing.zone} · {meter.capacityKw || 0} kW
          </span>
        </div>
      </div>

      <div className="space-y-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-leaf">{meter.isDemo ? 'DEMO SELLER · SAMPLE DATA' : 'COMMUNITY SOLAR SELLER'}</p>
            <h4 className="mt-1 truncate font-display text-lg font-bold text-ink">{listing.seller?.name || 'Community prosumer'}</h4>
            <p className="mt-1 text-xs text-muted">
              {meter.solarPanelBrand || meter.solarPanelModel
                ? [meter.solarPanelBrand, meter.solarPanelModel].filter(Boolean).join(' · ')
                : 'Panel brand / model not provided'}
            </p>
          </div>
          <div className="shrink-0 rounded-2xl bg-lime px-3 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-ink/65">Offer price</p>
            <p className="font-display text-lg font-extrabold text-ink">${Number(listing.askPricePerKwh).toFixed(3)}</p>
            <p className="text-[10px] text-ink/65">per kWh</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            ['Available to buy', `${Number(listing.remainingKwh).toFixed(2)} kWh`],
            ['Est. full-offer value', `$${totalValue.toFixed(2)}`],
            ['Solar panels', meter.solarPanelCount ? `${meter.solarPanelCount} panels` : 'Not provided'],
            ['Installed', meter.solarInstallationYear || 'Not provided']
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-canvas px-3 py-2.5">
              <p className="text-[10px] font-medium text-muted">{label}</p>
              <p className="mt-1 text-sm font-bold text-ink">{value}</p>
            </div>
          ))}
        </div>

        <div className="border-t border-ink/5 pt-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">Delivery window</p>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-ink">
            {new Date(listing.windowStart).toLocaleString()} – {new Date(listing.windowEnd).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-leaf/10 bg-leaf/5 p-3">
          <p className="text-xs font-semibold text-ink">
            {meter.solarDescription || 'Surplus electricity from the seller’s solar meter is offered for the delivery period above.'}
          </p>
          <p className="mt-1.5 text-[10px] leading-4 text-muted">
            {meter.isDemo
              ? 'Demo offer only: seller, solar illustration, panel layout, price, and energy data are simulated. This is not a real seller, panel photo, quotation, or measured solar output.'
              : `Panel details are provided by the seller and are not independently verified.${hasPhoto ? ' The image is a seller-provided photo, not an independent inspection.' : ''}`}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onPlaceBid(listing)}
          className="w-full rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white transition hover:bg-ink"
        >
          Place a bid · up to ${totalValue.toFixed(2)}
        </button>
      </div>
    </article>
  );
}

export default function Marketplace() {
  const { user } = useAuth();
  const toast = useToast();
  const [listings, setListings] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: pageSize, total: 0, pages: 0 });
  const [filters, setFilters] = useState({ minPrice: '', maxPrice: '', zone: user.zone || '', from: '', to: '' });
  const [appliedFilters, setAppliedFilters] = useState({});
  const [bid, setBid] = useState(initialBid);
  const [selectedListing, setSelectedListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadListings = useCallback(async (page, activeFilters) => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(activeFilters).filter(([, value]) => value !== '')
      );
      const { data } = await api.get('/listings', { params: { ...params, page, limit: pageSize } });
      setListings(data.data);
      setPagination(data.pagination);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load marketplace listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadListings(1, appliedFilters); }, [loadListings, appliedFilters]);

  const applyFilters = event => {
    event.preventDefault();
    if (filters.minPrice && filters.maxPrice && Number(filters.minPrice) > Number(filters.maxPrice)) {
      toast('Minimum price must not exceed maximum price.', 'error');
      return;
    }
    if (filters.from && filters.to && new Date(filters.from) > new Date(filters.to)) {
      toast('Delivery start must be before the delivery end filter.', 'error');
      return;
    }
    const nextFilters = { ...filters };
    if (nextFilters.from) nextFilters.from = new Date(nextFilters.from).toISOString();
    if (nextFilters.to) nextFilters.to = new Date(nextFilters.to).toISOString();
    setAppliedFilters(nextFilters);
  };

  const startBid = listing => {
    setSelectedListing(listing);
    setBid({
      quantityKwh: listing.remainingKwh,
      maxPricePerKwh: listing.askPricePerKwh,
      windowStart: toLocalInput(listing.windowStart),
      windowEnd: toLocalInput(listing.windowEnd)
    });
  };

  const submitBid = async event => {
    event.preventDefault();
    const quantity = Number(bid.quantityKwh);
    const maximumPrice = Number(bid.maxPricePerKwh);
    const start = new Date(bid.windowStart);
    const end = new Date(bid.windowEnd);
    if (quantity > selectedListing.remainingKwh) {
      toast('Bid quantity cannot exceed the listing’s remaining energy.', 'error');
      return;
    }
    if (maximumPrice < selectedListing.askPricePerKwh) {
      toast('Maximum bid price must meet or exceed the listing price.', 'error');
      return;
    }
    if (start >= end || start < new Date(selectedListing.windowStart) || end > new Date(selectedListing.windowEnd)) {
      toast('Bid delivery window must fit within the selected listing’s delivery window.', 'error');
      return;
    }
    setSaving(true);
    try {
      await api.post('/bids', {
        quantityKwh: Number(bid.quantityKwh),
        maxPricePerKwh: Number(bid.maxPricePerKwh),
        windowStart: new Date(bid.windowStart).toISOString(),
        windowEnd: new Date(bid.windowEnd).toISOString()
      });
      toast('Your bid has been placed.');
      setSelectedListing(null);
      setBid(initialBid);
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to place bid.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <DashboardHero
        eyebrow="COMMUNITY ENERGY MARKET"
        title="Marketplace"
        description="Find local clean energy, refine offers, and place bids for the delivery window you need."
      />
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <form onSubmit={applyFilters} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <label className="text-xs font-semibold text-ink">Min price
            <input type="number" min="0" step="0.001" value={filters.minPrice} onChange={event => setFilters({ ...filters, minPrice: event.target.value })} className="form-input mt-1" />
          </label>
          <label className="text-xs font-semibold text-ink">Max price
            <input type="number" min="0" step="0.001" value={filters.maxPrice} onChange={event => setFilters({ ...filters, maxPrice: event.target.value })} className="form-input mt-1" />
          </label>
          <label className="text-xs font-semibold text-ink">Zone
            <input value={filters.zone} onChange={event => setFilters({ ...filters, zone: event.target.value })} className="form-input mt-1" />
          </label>
          <label className="text-xs font-semibold text-ink">Delivery from
            <input type="datetime-local" value={filters.from} onChange={event => setFilters({ ...filters, from: event.target.value })} className="form-input mt-1" />
          </label>
          <label className="text-xs font-semibold text-ink">Delivery by
            <input type="datetime-local" value={filters.to} onChange={event => setFilters({ ...filters, to: event.target.value })} className="form-input mt-1" />
          </label>
          <div className="flex items-end gap-2">
            <button className="flex-1 rounded-xl bg-leaf px-3 py-3 text-xs font-bold text-white hover:bg-ink">Filter offers</button>
            <button type="button" onClick={() => { setFilters({ minPrice: '', maxPrice: '', zone: '', from: '', to: '' }); setAppliedFilters({}); }} className="rounded-xl border border-ink/10 px-3 py-3 text-xs font-bold text-ink">Clear</button>
          </div>
        </form>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="font-display text-xl font-semibold text-ink">Available listings</h3><p className="mt-1 text-xs text-muted">          {pagination.total} {pagination.total === 1 ? 'offer' : 'offers'} available</p></div>
          <span className="rounded-full bg-canvas px-3 py-1.5 text-xs font-semibold text-leaf">Your zone · {user.zone || '—'}</span>
        </div>
        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={() => loadListings(pagination.page, appliedFilters)} /></div>}
        {loading ? (
          <div className="py-12"><Loader compact label="Finding local solar offers…" /></div>
        ) : listings.length === 0 ? (
          <div className="rounded-2xl bg-canvas px-5 py-12 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-lime/60 text-2xl text-ink" aria-hidden="true">☼</div>
            <h4 className="mt-4 font-display text-lg font-bold text-ink">No matching solar offers yet</h4>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">Try another zone or clear your filters. New offers appear when solar sellers list surplus energy for a delivery window.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {listings.map(listing => (
              <SolarOfferCard key={listing._id} listing={listing} onPlaceBid={startBid} />
            ))}
          </div>
        )}
        {pagination.pages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-ink/5 pt-4">
            <p className="text-xs text-muted">{pagination.total} solar offers · Page {pagination.page} of {pagination.pages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={pagination.page <= 1 || loading} onClick={() => loadListings(pagination.page - 1, appliedFilters)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-40">Previous</button>
              <button type="button" disabled={pagination.page >= pagination.pages || loading} onClick={() => loadListings(pagination.page + 1, appliedFilters)} className="rounded-lg border border-ink/10 px-3 py-2 text-xs font-bold disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </section>

      {selectedListing && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-ink/50 p-4">
          <form onSubmit={submitBid} className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-bold uppercase tracking-[0.16em] text-leaf">BID REQUEST</p><h3 className="mt-1 font-display text-xl font-bold text-ink">Place a bid</h3><p className="mt-1 text-xs text-muted">{selectedListing.remainingKwh} kWh available at ${Number(selectedListing.askPricePerKwh).toFixed(3)}/kWh</p></div>
              <button type="button" onClick={() => setSelectedListing(null)} aria-label="Close bid form" className="rounded-lg border border-ink/10 px-3 py-1 text-lg">×</button>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-semibold text-ink">Quantity (kWh)
                <input required min="0.001" step="0.001" type="number" value={bid.quantityKwh} onChange={event => setBid({ ...bid, quantityKwh: event.target.value })} className="form-input mt-2" />
              </label>
              <label className="text-xs font-semibold text-ink">Maximum price ($/kWh)
                <input required min="0.001" step="0.001" type="number" value={bid.maxPricePerKwh} onChange={event => setBid({ ...bid, maxPricePerKwh: event.target.value })} className="form-input mt-2" />
              </label>
              <label className="text-xs font-semibold text-ink">Delivery starts
                <input required type="datetime-local" value={bid.windowStart} onChange={event => setBid({ ...bid, windowStart: event.target.value })} className="form-input mt-2" />
              </label>
              <label className="text-xs font-semibold text-ink">Delivery ends
                <input required type="datetime-local" value={bid.windowEnd} onChange={event => setBid({ ...bid, windowEnd: event.target.value })} className="form-input mt-2" />
              </label>
            </div>
            <p className="mt-3 rounded-xl bg-canvas p-3 text-xs text-muted">Estimated maximum commitment: <strong className="text-ink">${(Number(bid.quantityKwh || 0) * Number(bid.maxPricePerKwh || 0)).toFixed(2)}</strong>. Your wallet must cover the full amount. You are charged only for energy actually delivered and settled.</p>
            <div className="mt-5 flex justify-end gap-3">
              <button type="button" onClick={() => setSelectedListing(null)} className="rounded-xl border border-ink/10 px-4 py-2 text-sm font-bold">Cancel</button>
              <button disabled={saving} className="rounded-xl bg-leaf px-4 py-2 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Placing…' : 'Submit bid'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
