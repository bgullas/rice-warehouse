import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shuffle, MapPin, Check, ChevronRight, Wheat } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import type { RiceType } from '../types';
import { generateLotNumber } from '../utils/helpers';

const RICE_TYPES: RiceType[] = [
  'Basmati 1121', 'Basmati 386', 'Ponni Rice', 'Golden Ponni',
  'Idly Ponni', 'Broken Rice', 'Sona Masuri', 'PR-14',
  'Parboiled', 'Brown Rice', 'Glutinous', 'Short Grain', 'Long Grain', 'Other',
];
const GRADES = ['Premium', 'Grade A', 'Grade B', 'Grade C', 'Standard'];
const COUNTRIES = ['India', 'Thailand', 'Vietnam', 'Myanmar', 'Pakistan', 'Sri Lanka', 'Cambodia', 'Singapore', 'Other'];

export default function MobileAddContainer() {
  const nav = useNavigate();
  const { data, addLot, getFirstAvailableSlot } = useAppStore();
  const { currentUser } = useAuth();

  const today = new Date().toISOString().split('T')[0];
  const [lotNumber, setLotNumber] = useState(generateLotNumber());
  const [riceType, setRiceType] = useState<RiceType>('Basmati 1121');
  const [grade, setGrade] = useState('Grade A');
  const [supplier, setSupplier] = useState('');
  const [country, setCountry] = useState('India');
  const [origin, setOrigin] = useState('');
  const [quantity, setQuantity] = useState('');
  const [weightPerUnit, setWeightPerUnit] = useState('50');
  const [moisture, setMoisture] = useState('13.0');
  const [temperature, setTemperature] = useState('25');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [dateIn, setDateIn] = useState(today);
  const [notes, setNotes] = useState('');

  const [autoSlot, setAutoSlot] = useState(true);
  const [slotId, setSlotId] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const availableSlots = data.slots.filter(s => s.status === 'empty');

  useEffect(() => {
    if (autoSlot) {
      const s = getFirstAvailableSlot();
      setSlotId(s?.id ?? '');
    }
  }, [autoSlot, getFirstAvailableSlot]);

  const selectedSlot = data.slots.find(s => s.id === slotId);
  const totalWeight = (Number(quantity) || 0) * (Number(weightPerUnit) || 0);

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!lotNumber) e.lotNumber = 'Required';
    if (!slotId) e.slotId = 'No slot selected';
    if (!supplier.trim()) e.supplier = 'Required';
    if (!origin.trim()) e.origin = 'Required';
    if (!quantity || Number(quantity) <= 0) e.quantity = 'Enter bags';
    if (!invoiceNumber.trim()) e.invoiceNumber = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    const expiry = new Date(new Date(dateIn).getTime() + 365 * 86400000).toISOString().split('T')[0];
    addLot({
      lotNumber, slotId, riceType, grade, supplier: supplier.trim(),
      supplierCountry: country, origin: origin.trim(),
      quantity: Number(quantity), weightPerUnit: Number(weightPerUnit), totalWeight,
      dateIn, expiryDate: expiry, temperature: Number(temperature), moisture: Number(moisture),
      batchNumber: '', invoiceNumber: invoiceNumber.trim(), doNumber: '', vehicleNumber: '',
      receivedBy: currentUser?.name ?? '', notes: notes.trim(), status: 'active',
    }, currentUser!);
    setSaving(false);
    setDone(true);
  }

  if (done) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check size={40} className="text-green-600" strokeWidth={3} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Container Logged</h2>
        <p className="text-gray-500 text-sm mt-1">{lotNumber}</p>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mt-5 w-full text-left space-y-1.5">
          <Row label="Rice Type" value={riceType} />
          <Row label="Slot" value={selectedSlot?.label ?? '—'} />
          <Row label="Quantity" value={`${quantity} bags (${totalWeight} kg)`} />
        </div>
        <div className="flex flex-col gap-2 w-full mt-5">
          <button
            onClick={() => {
              // reset for next entry
              setLotNumber(generateLotNumber()); setSupplier(''); setOrigin('');
              setQuantity(''); setInvoiceNumber(''); setNotes('');
              setAutoSlot(true); setDone(false);
            }}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-medium active:bg-green-800"
          >
            Log Another
          </button>
          <button onClick={() => nav('/m')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium active:bg-gray-200">
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-6">
      <h1 className="text-xl font-bold text-gray-900">Add Container</h1>

      {/* Lot number */}
      <Card>
        <Label>Lot Number</Label>
        <div className="flex gap-2">
          <input className="mob-input flex-1" value={lotNumber} onChange={e => setLotNumber(e.target.value)} />
          <button onClick={() => setLotNumber(generateLotNumber())} className="px-3 bg-gray-100 rounded-xl active:bg-gray-200">
            <Shuffle size={16} className="text-gray-500" />
          </button>
        </div>
      </Card>

      {/* Rice details */}
      <Card>
        <Label>Rice Type</Label>
        <div className="relative mb-3">
          <Wheat size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <select className="mob-input pl-9 appearance-none" value={riceType} onChange={e => setRiceType(e.target.value as RiceType)}>
            {RICE_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <Label>Grade</Label>
        <div className="grid grid-cols-3 gap-2">
          {GRADES.slice(0, 3).map(g => (
            <button
              key={g}
              onClick={() => setGrade(g)}
              className={`py-2 rounded-lg text-sm font-medium border ${grade === g ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-600 border-gray-200'}`}
            >
              {g}
            </button>
          ))}
        </div>
      </Card>

      {/* Slot allocation */}
      <Card>
        <Label>Storage Slot</Label>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button
            onClick={() => setAutoSlot(true)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border ${autoSlot ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            <Shuffle size={15} /> Auto (FIFO)
          </button>
          <button
            onClick={() => setAutoSlot(false)}
            className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-medium border ${!autoSlot ? 'bg-green-50 text-green-700 border-green-300' : 'bg-white text-gray-500 border-gray-200'}`}
          >
            <MapPin size={15} /> Manual
          </button>
        </div>
        {autoSlot ? (
          <div className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm text-gray-700">
            {selectedSlot ? <>Assigned to <strong className="text-green-700">{selectedSlot.label}</strong></> : 'No empty slots available'}
          </div>
        ) : (
          <select className="mob-input" value={slotId} onChange={e => setSlotId(e.target.value)}>
            <option value="">— Select slot —</option>
            {availableSlots.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        )}
        {errors.slotId && <Err>{errors.slotId}</Err>}
      </Card>

      {/* Supplier */}
      <Card>
        <Label>Supplier</Label>
        <input className="mob-input mb-1" value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Supplier name" />
        {errors.supplier && <Err>{errors.supplier}</Err>}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <div>
            <Label>Country</Label>
            <select className="mob-input" value={country} onChange={e => setCountry(e.target.value)}>
              {COUNTRIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <Label>Origin/Region</Label>
            <input className="mob-input" value={origin} onChange={e => setOrigin(e.target.value)} placeholder="e.g. Punjab" />
          </div>
        </div>
        {errors.origin && <Err>{errors.origin}</Err>}
      </Card>

      {/* Quantity */}
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>No. of Bags</Label>
            <input type="number" inputMode="numeric" className="mob-input" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="0" />
            {errors.quantity && <Err>{errors.quantity}</Err>}
          </div>
          <div>
            <Label>kg / Bag</Label>
            <input type="number" inputMode="decimal" className="mob-input" value={weightPerUnit} onChange={e => setWeightPerUnit(e.target.value)} />
          </div>
        </div>
        <div className="mt-3 bg-green-50 rounded-xl px-3 py-2.5 flex items-center justify-between">
          <span className="text-sm text-green-800">Total Weight</span>
          <span className="font-bold text-green-700">{totalWeight.toLocaleString()} kg</span>
        </div>
      </Card>

      {/* Quality */}
      <Card>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Moisture (%)</Label>
            <input type="number" inputMode="decimal" step="0.1" className="mob-input" value={moisture} onChange={e => setMoisture(e.target.value)} />
            {Number(moisture) > 14 && <p className="text-orange-600 text-[11px] mt-1">⚠ Above SFA 14%</p>}
          </div>
          <div>
            <Label>Temp (°C)</Label>
            <input type="number" inputMode="decimal" step="0.1" className="mob-input" value={temperature} onChange={e => setTemperature(e.target.value)} />
          </div>
        </div>
      </Card>

      {/* Invoice & date */}
      <Card>
        <Label>Invoice Number</Label>
        <input className="mob-input mb-1" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} placeholder="INV-..." />
        {errors.invoiceNumber && <Err>{errors.invoiceNumber}</Err>}
        <div className="mt-3">
          <Label>Date In</Label>
          <input type="date" className="mob-input" value={dateIn} onChange={e => setDateIn(e.target.value)} />
        </div>
        <div className="mt-3">
          <Label>Notes (optional)</Label>
          <textarea className="mob-input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
      </Card>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={saving}
        className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-green-800 disabled:opacity-60"
      >
        {saving ? 'Logging…' : <>Log Container <ChevronRight size={18} /></>}
      </button>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="bg-white rounded-xl border border-gray-200 p-4">{children}</div>;
}
function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}
function Err({ children }: { children: React.ReactNode }) {
  return <p className="text-red-600 text-[11px] mt-1">{children}</p>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
