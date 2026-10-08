import { useCallback, useEffect, useState } from 'react';
import api from '../api/axios';
import DataTable from '../components/DataTable';
import ErrorMessage from '../components/ErrorMessage';
import { useToast } from '../context/ToastContext';
import { prepareSolarPhotos } from '../utils/solarPhoto';

const initialForm = {
  serialNo: '',
  type: 'generation',
  capacityKw: '',
  zone: '',
  solarPanelBrand: '',
  solarPanelModel: '',
  solarPanelCount: '',
  solarInstallationYear: '',
  solarDescription: '',
  solarPhotoData: '',
  solarPhotoContentType: ''
};

export default function Meters() {
  const [meters, setMeters] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [solarPhotoPreview, setSolarPhotoPreview] = useState('');
  const [editingMeter, setEditingMeter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  const loadMeters = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/meters');
      setMeters(data);
      setError('');
    } catch (requestError) {
      setError(requestError.response?.data?.message || 'Unable to load meters.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMeters(); }, [loadMeters]);

  const createMeter = async event => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.post('/meters', {
        ...form,
        capacityKw: Number(form.capacityKw)
      });
      setForm(initialForm);
      if (solarPhotoPreview) URL.revokeObjectURL(solarPhotoPreview);
      setSolarPhotoPreview('');
      toast('Meter added successfully.');
      await loadMeters();
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to add meter.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const saveSolarProfile = async event => {
    event.preventDefault();
    if (!editingMeter) return;
    setSaving(true);
    try {
      const profile = {
        solarPanelBrand: form.solarPanelBrand,
        solarPanelModel: form.solarPanelModel,
        solarPanelCount: form.solarPanelCount,
        solarInstallationYear: form.solarInstallationYear,
        solarDescription: form.solarDescription
      };
      if (form.solarPhotoData) {
        profile.solarPhotoData = form.solarPhotoData;
        profile.solarPhotoContentType = form.solarPhotoContentType;
      }
      await api.patch(`/meters/${editingMeter._id}/solar-profile`, profile);
      toast('Solar panel details updated for future listings.');
      setEditingMeter(null);
      setForm(initialForm);
      if (solarPhotoPreview) URL.revokeObjectURL(solarPhotoPreview);
      setSolarPhotoPreview('');
      await loadMeters();
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to update your solar panel details.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const editSolarProfile = meter => {
    setEditingMeter(meter);
    setForm({
      ...initialForm,
      serialNo: meter.serialNo,
      type: meter.type,
      capacityKw: String(meter.capacityKw || ''),
      zone: meter.zone || '',
      solarPanelBrand: meter.solarPanelBrand || '',
      solarPanelModel: meter.solarPanelModel || '',
      solarPanelCount: meter.solarPanelCount ? String(meter.solarPanelCount) : '',
      solarInstallationYear: meter.solarInstallationYear ? String(meter.solarInstallationYear) : '',
      solarDescription: meter.solarDescription || ''
    });
    if (solarPhotoPreview) URL.revokeObjectURL(solarPhotoPreview);
    setSolarPhotoPreview('');
  };

  const cancelEditSolarProfile = () => {
    setEditingMeter(null);
    setForm(initialForm);
    if (solarPhotoPreview) URL.revokeObjectURL(solarPhotoPreview);
    setSolarPhotoPreview('');
  };

  const selectSolarPhoto = async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const [photo] = await prepareSolarPhotos([file]);
      if (solarPhotoPreview) URL.revokeObjectURL(solarPhotoPreview);
      setSolarPhotoPreview(photo.preview);
      setForm(current => ({
        ...current,
        solarPhotoData: photo.data,
        solarPhotoContentType: photo.contentType
      }));
    } catch (photoError) {
      toast(photoError.message, 'error');
      event.target.value = '';
    }
  };

  const simulate = async meter => {
    try {
      const { data } = await api.post(`/meters/${meter._id}/simulate`, {});
      toast(data.message || 'Meter readings simulated.');
    } catch (requestError) {
      toast(requestError.response?.data?.message || 'Unable to simulate meter readings.', 'error');
    }
  };

  const columns = [
    { key: 'serialNo', label: 'Meter' },
    { key: 'type', label: 'Type', render: value => <span className="capitalize">{value}</span> },
    { key: 'capacityKw', label: 'Capacity', render: value => `${value} kW` },
    { key: 'zone', label: 'Zone' },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, meter) => (
        <div className="flex flex-wrap gap-2">
          {meter.type === 'generation' && (
            <button type="button" onClick={() => editSolarProfile(meter)} className="rounded-lg border border-leaf/30 bg-leaf/5 px-3 py-1.5 text-xs font-bold text-leaf hover:border-leaf">
              Solar details
            </button>
          )}
          <button type="button" onClick={() => simulate(meter)} className="rounded-lg border border-ink/10 px-3 py-1.5 text-xs font-bold text-leaf hover:border-leaf">
            Simulate today
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-white p-6 shadow-card sm:p-8">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-leaf">ENERGY SOURCES</p>
        <h2 className="mt-2 font-display text-2xl font-semibold text-ink">{editingMeter ? 'Update solar profile' : 'Add a meter'}</h2>
        <p className="mt-2 text-sm text-muted">{editingMeter ? `Share accurate panel details for your ${editingMeter.serialNo} meter. Buyers will see these details with future offers.` : 'Add your generation meter and share real panel details so buyers can understand the solar offer before placing a bid.'}</p>
        <form onSubmit={editingMeter ? saveSolarProfile : createMeter} className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {!editingMeter && (
            <>
          <label className="text-xs font-semibold text-ink">
            Serial number
            <input required value={form.serialNo} onChange={event => setForm({ ...form, serialNo: event.target.value })} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">
            Meter type
            <select value={form.type} onChange={event => setForm({ ...form, type: event.target.value })} className="form-input mt-2">
              <option value="generation">Generation</option>
              <option value="consumption">Consumption</option>
              <option value="bidirectional">Bidirectional</option>
            </select>
          </label>
          <label className="text-xs font-semibold text-ink">
            Capacity (kW)
            <input required min="0.01" step="0.01" type="number" value={form.capacityKw} onChange={event => setForm({ ...form, capacityKw: event.target.value })} className="form-input mt-2" />
          </label>
          <label className="text-xs font-semibold text-ink">
            Zone
            <input value={form.zone} onChange={event => setForm({ ...form, zone: event.target.value })} className="form-input mt-2" placeholder="Use your account zone" />
          </label>
            </>
          )}
          {(!editingMeter && form.type === 'generation') || editingMeter ? (
            <>
              <label className="text-xs font-semibold text-ink">
                Solar panel brand <span className="font-normal text-muted">optional</span>
                <input maxLength={80} value={form.solarPanelBrand} onChange={event => setForm({ ...form, solarPanelBrand: event.target.value })} className="form-input mt-2" placeholder="Enter the actual brand" />
              </label>
              <label className="text-xs font-semibold text-ink">
                Panel model <span className="font-normal text-muted">optional</span>
                <input maxLength={80} value={form.solarPanelModel} onChange={event => setForm({ ...form, solarPanelModel: event.target.value })} className="form-input mt-2" placeholder="Enter the actual model" />
              </label>
              <label className="text-xs font-semibold text-ink">
                Number of panels <span className="font-normal text-muted">optional</span>
                <input min="1" max="10000" step="1" type="number" value={form.solarPanelCount} onChange={event => setForm({ ...form, solarPanelCount: event.target.value })} className="form-input mt-2" placeholder="e.g. 12" />
              </label>
              <label className="text-xs font-semibold text-ink">
                Installation year <span className="font-normal text-muted">optional</span>
                <input min="1950" max={new Date().getFullYear()} step="1" type="number" value={form.solarInstallationYear} onChange={event => setForm({ ...form, solarInstallationYear: event.target.value })} className="form-input mt-2" placeholder="e.g. 2022" />
              </label>
              <label className="text-xs font-semibold text-ink sm:col-span-2 lg:col-span-3">
                Photo of your solar panels <span className="font-normal text-muted">optional · buyers can preview it</span>
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectSolarPhoto} className="form-input mt-2 file:mr-3 file:rounded-lg file:border-0 file:bg-leaf/10 file:px-3 file:py-2 file:text-xs file:font-bold file:text-leaf" />
              </label>
              {solarPhotoPreview && (
                <img src={solarPhotoPreview} alt="Preview of your solar panels" className="h-36 w-full rounded-2xl object-cover sm:col-span-2 lg:col-span-3" />
              )}
              <label className="text-xs font-semibold text-ink sm:col-span-2 lg:col-span-3">
                Notes for energy buyers <span className="font-normal text-muted">optional</span>
                <textarea maxLength={500} rows={3} value={form.solarDescription} onChange={event => setForm({ ...form, solarDescription: event.target.value })} className="form-input mt-2 resize-y" placeholder="Share helpful, accurate details about your solar setup and how your surplus energy is produced." />
              </label>
            </>
          ) : null}
          <button disabled={saving} className="rounded-xl bg-leaf px-4 py-3 text-sm font-bold text-white hover:bg-ink disabled:opacity-60">
            {saving ? (editingMeter ? 'Saving…' : 'Adding…') : editingMeter ? 'Save solar details' : 'Add meter and solar details'}
          </button>
          {editingMeter && (
            <button type="button" onClick={cancelEditSolarProfile} className="rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold text-ink">
              Cancel editing
            </button>
          )}
        </form>
      </section>

      <section className="rounded-3xl bg-white p-5 shadow-card sm:p-7">
        <div className="mb-5">
          <h2 className="font-display text-xl font-semibold text-ink">My meters</h2>
          <p className="mt-1 text-xs text-muted">Meter readings show generation history; panel information you provide is displayed to buyers with your offers.</p>
        </div>
        {error && <div className="mb-4"><ErrorMessage message={error} onRetry={loadMeters} /></div>}
        <DataTable columns={columns} data={meters} loading={loading} emptyMessage="No meters yet. Add your first meter above." />
      </section>
    </div>
  );
}
