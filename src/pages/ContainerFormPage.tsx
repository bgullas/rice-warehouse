import { useState, useEffect } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Shuffle, MapPin } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import type { ContainerLot, RiceType } from '../types';
import { generateLotNumber } from '../utils/helpers';

const RICE_TYPES: RiceType[] = [
  'Jasmine White', 'Jasmine Brown', 'Basmati', 'Parboiled',
  'Short Grain', 'Long Grain', 'Glutinous', 'Brown Rice', 'Fragrant', 'Other',
];

const ORIGINS = ['Thailand', 'Vietnam', 'India', 'Myanmar', 'Pakistan', 'Cambodia', 'Laos', 'USA', 'Australia', 'Other'];

const GRADES = ['Premium', 'Grade A', 'Grade B', 'Grade C', 'Standard'];

type FormData = Omit<ContainerLot, 'id'>;

export default function ContainerFormPage() {
  const nav = useNavigate();
  const [params] = useSearchParams();
  const editId = params.get('edit');
  const slotParam = params.get('slot');

  const { data, addLot, updateLot, getFirstAvailableSlot } = useAppStore();
  const { currentUser } = useAuth();

  const existingLot = editId ? data.lots.find(l => l.id === editId) : undefined;

  const [form, setForm] = useState<FormData>(() => {
    if (existingLot) return { ...existingLot };
    const today = new Date().toISOString().split('T')[0];
    const expiry = new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0];
    return {
      lotNumber: generateLotNumber(),
      slotId: slotParam ?? '',
      riceType: 'Jasmine White',
      grade: 'Grade A',
      supplier: '',
      supplierCountry: 'Thailand',
      origin: '',
      quantity: 0,
      weightPerUnit: 50,
      totalWeight: 0,
      dateIn: today,
      expiryDate: expiry,
      temperature: 25,
      moisture: 13.5,
      batchNumber: '',
      invoiceNumber: '',
      doNumber: '',
      vehicleNumber: '',
      receivedBy: currentUser?.name ?? '',
      notes: '',
      status: 'active',
    };
  });

  const [autoSlot, setAutoSlot] = useState(!slotParam && !editId);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const availableSlots = data.slots.filter(s => s.status === 'empty');

  useEffect(() => {
    if (autoSlot && !editId) {
      const slot = getFirstAvailableSlot();
      if (slot) setForm(f => ({ ...f, slotId: slot.id }));
    }
  }, [autoSlot, editId, getFirstAvailableSlot]);

  useEffect(() => {
    setForm(f => ({ ...f, totalWeight: f.quantity * f.weightPerUnit }));
  }, [form.quantity, form.weightPerUnit]);

  function set(key: keyof FormData, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
    setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.lotNumber) e.lotNumber = 'Required';
    if (!form.slotId) e.slotId = 'Select a slot';
    if (!form.supplier) e.supplier = 'Required';
    if (!form.origin) e.origin = 'Required';
    if (!form.quantity || form.quantity <= 0) e.quantity = 'Must be > 0';
    if (!form.weightPerUnit || form.weightPerUnit <= 0) e.weightPerUnit = 'Must be > 0';
    if (!form.invoiceNumber) e.invoiceNumber = 'Required';
    if (form.moisture < 0 || form.moisture > 20) e.moisture = '0–20%';
    if (form.temperature < 0 || form.temperature > 50) e.temperature = '0–50°C';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 300));
    if (editId) {
      updateLot(editId, form);
    } else {
      addLot(form, currentUser!);
    }
    setSaving(false);
    nav('/containers');
  }

  const selectedSlot = data.slots.find(s => s.id === form.slotId);

  return (
    <div className="p-6 max-w-4xl">
      <button onClick={() => nav(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft size={16} />
        Back
      </button>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        {editId ? 'Edit Container Lot' : 'Log New Container'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Lot Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Lot Number *" error={errors.lotNumber}>
              <div className="flex gap-2">
                <input className="input flex-1" value={form.lotNumber} onChange={e => set('lotNumber', e.target.value)} />
                <button type="button" onClick={() => set('lotNumber', generateLotNumber())} className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Shuffle size={16} className="text-gray-500" />
                </button>
              </div>
            </FormField>

            <FormField label="Storage Slot *" error={errors.slotId}>
              {!editId && (
                <div className="flex items-center gap-3 mb-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={autoSlot} onChange={() => setAutoSlot(true)} />
                    <span className="flex items-center gap-1"><Shuffle size={13} /> Auto-allocate (FIFO)</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="radio" checked={!autoSlot} onChange={() => setAutoSlot(false)} />
                    <span className="flex items-center gap-1"><MapPin size={13} /> Manual</span>
                  </label>
                </div>
              )}
              {(!autoSlot || editId) ? (
                <select className="input" value={form.slotId} onChange={e => set('slotId', e.target.value)}>
                  <option value="">— Select slot —</option>
                  {editId && form.slotId && <option value={form.slotId}>{selectedSlot?.label} (current)</option>}
                  {availableSlots.filter(s => s.id !== form.slotId).map(s => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
              ) : (
                <div className="input bg-gray-50 text-gray-700">
                  {selectedSlot ? `Auto-assigned: ${selectedSlot.label}` : 'No empty slots available'}
                </div>
              )}
            </FormField>

            <FormField label="Rice Type *">
              <select className="input" value={form.riceType} onChange={e => set('riceType', e.target.value as RiceType)}>
                {RICE_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </FormField>

            <FormField label="Grade *">
              <select className="input" value={form.grade} onChange={e => set('grade', e.target.value)}>
                {GRADES.map(g => <option key={g}>{g}</option>)}
              </select>
            </FormField>

            <FormField label="Date In *">
              <input type="date" className="input" value={form.dateIn} onChange={e => set('dateIn', e.target.value)} />
            </FormField>

            <FormField label="Expiry Date *">
              <input type="date" className="input" value={form.expiryDate} onChange={e => set('expiryDate', e.target.value)} />
            </FormField>
          </div>
        </section>

        {/* Supplier */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Supplier & Origin</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Supplier Name *" error={errors.supplier}>
              <input className="input" value={form.supplier} onChange={e => set('supplier', e.target.value)} placeholder="e.g. Thai Rice Co. Ltd" />
            </FormField>
            <FormField label="Supplier Country *">
              <select className="input" value={form.supplierCountry} onChange={e => set('supplierCountry', e.target.value)}>
                {ORIGINS.map(o => <option key={o}>{o}</option>)}
              </select>
            </FormField>
            <FormField label="Region/Origin *" error={errors.origin}>
              <input className="input" value={form.origin} onChange={e => set('origin', e.target.value)} placeholder="e.g. Surin Province" />
            </FormField>
            <FormField label="Invoice Number *" error={errors.invoiceNumber}>
              <input className="input" value={form.invoiceNumber} onChange={e => set('invoiceNumber', e.target.value)} />
            </FormField>
            <FormField label="DO Number">
              <input className="input" value={form.doNumber} onChange={e => set('doNumber', e.target.value)} />
            </FormField>
            <FormField label="Batch Number">
              <input className="input" value={form.batchNumber} onChange={e => set('batchNumber', e.target.value)} />
            </FormField>
          </div>
        </section>

        {/* Quantity */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Quantity & Weight</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Number of Bags/Sacks *" error={errors.quantity}>
              <input type="number" min="1" className="input" value={form.quantity || ''} onChange={e => set('quantity', +e.target.value)} />
            </FormField>
            <FormField label="Weight per Bag (kg) *" error={errors.weightPerUnit}>
              <input type="number" min="1" step="0.5" className="input" value={form.weightPerUnit || ''} onChange={e => set('weightPerUnit', +e.target.value)} />
            </FormField>
            <FormField label="Total Weight (kg)">
              <div className="input bg-gray-50 font-semibold text-green-700">{(form.quantity * form.weightPerUnit).toLocaleString()}</div>
            </FormField>
          </div>
        </section>

        {/* Quality */}
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-gray-800 mb-4 pb-2 border-b border-gray-100">Quality Parameters</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Temperature (°C)" error={errors.temperature}>
              <input type="number" step="0.1" min="0" max="50" className="input" value={form.temperature} onChange={e => set('temperature', +e.target.value)} />
            </FormField>
            <FormField label="Moisture (%)" error={errors.moisture}>
              <input type="number" step="0.1" min="0" max="20" className="input" value={form.moisture} onChange={e => set('moisture', +e.target.value)} />
              {form.moisture > 14 && <p className="text-orange-600 text-xs mt-1">⚠ Above SFA recommended 14%</p>}
            </FormField>
            <FormField label="Vehicle Number">
              <input className="input" value={form.vehicleNumber} onChange={e => set('vehicleNumber', e.target.value)} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Received By">
              <input className="input" value={form.receivedBy} onChange={e => set('receivedBy', e.target.value)} />
            </FormField>
          </div>
          <div className="mt-4">
            <FormField label="Notes / Remarks">
              <textarea className="input resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} />
            </FormField>
          </div>
        </section>

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => nav(-1)} className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="px-5 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-medium disabled:opacity-60">
            {saving ? 'Saving…' : editId ? 'Update Lot' : 'Log Container'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {error && <p className="text-red-600 text-xs mt-1">{error}</p>}
    </div>
  );
}
