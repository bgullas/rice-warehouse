import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { differenceInDays, parseISO } from 'date-fns';
import { Search, Check, ChevronLeft, Truck, AlertTriangle, PackageMinus } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import type { ContainerLot } from '../types';
import { getAgeCategory, ageCategoryColor, formatDate, numberWithCommas } from '../utils/helpers';

export default function MobileCheckout() {
  const { data, dispatchLot } = useAppStore();
  const { currentUser } = useAuth();
  const nav = useNavigate();
  const [params] = useSearchParams();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<ContainerLot | null>(null);
  const [dispatchedTo, setDispatchedTo] = useState('');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const activeLots = useMemo(
    () => [...data.lots.filter(l => l.status === 'active')].sort((a, b) => a.dateIn.localeCompare(b.dateIn)),
    [data.lots]
  );

  // Deep link from overview (?lot=id)
  useEffect(() => {
    const lotId = params.get('lot');
    if (lotId) {
      const lot = data.lots.find(l => l.id === lotId && l.status === 'active');
      if (lot) setSelected(lot);
    }
  }, [params, data.lots]);

  const filtered = useMemo(() => {
    if (!search) return activeLots;
    const q = search.toLowerCase();
    return activeLots.filter(l =>
      l.lotNumber.toLowerCase().includes(q) ||
      l.riceType.toLowerCase().includes(q) ||
      l.supplier.toLowerCase().includes(q)
    );
  }, [activeLots, search]);

  const oldestId = activeLots[0]?.id;

  async function confirm() {
    if (!selected || !dispatchedTo.trim() || !ref.trim()) return;
    setSaving(true);
    await new Promise(r => setTimeout(r, 350));
    dispatchLot(selected.id, { dispatchedTo: dispatchedTo.trim(), dispatchRef: ref.trim(), notes: notes.trim() }, currentUser!);
    setSaving(false);
    setDone(true);
  }

  // Success screen
  if (done && selected) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mb-4">
          <Check size={40} className="text-green-600" strokeWidth={3} />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Dispatched</h2>
        <p className="text-gray-500 text-sm mt-1">{selected.lotNumber} checked out</p>
        <div className="bg-white rounded-xl border border-gray-200 p-4 mt-5 w-full text-left space-y-1.5">
          <Row label="Rice Type" value={selected.riceType} />
          <Row label="Quantity" value={`${selected.quantity} bags (${numberWithCommas(selected.totalWeight)} kg)`} />
          <Row label="Dispatched To" value={dispatchedTo} />
          <Row label="Reference" value={ref} />
        </div>
        <div className="flex flex-col gap-2 w-full mt-5">
          <button
            onClick={() => { setSelected(null); setDispatchedTo(''); setRef(''); setNotes(''); setDone(false); }}
            className="w-full bg-green-700 text-white py-3 rounded-xl font-medium active:bg-green-800"
          >
            Dispatch Another
          </button>
          <button onClick={() => nav('/m')} className="w-full bg-gray-100 text-gray-700 py-3 rounded-xl font-medium active:bg-gray-200">
            Back to Overview
          </button>
        </div>
      </div>
    );
  }

  // Confirmation screen
  if (selected) {
    const days = differenceInDays(new Date(), parseISO(selected.dateIn));
    const cat = getAgeCategory(selected.dateIn);
    const slot = data.slots.find(s => s.id === selected.slotId);
    const isOldest = selected.id === oldestId;

    return (
      <div className="p-4 space-y-4">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-gray-600 text-sm">
          <ChevronLeft size={18} /> Back to list
        </button>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-bold text-gray-900">{selected.lotNumber}</p>
              <p className="text-sm text-gray-500">{selected.riceType} · {selected.grade}</p>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full text-white" style={{ background: ageCategoryColor(cat) }}>
              {days}d
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <Row label="Slot" value={slot?.label ?? '—'} />
            <Row label="Date In" value={formatDate(selected.dateIn)} />
            <Row label="Quantity" value={`${selected.quantity} bags`} />
            <Row label="Weight" value={`${numberWithCommas(selected.totalWeight)} kg`} />
            <Row label="Supplier" value={selected.supplier} />
            <Row label="Origin" value={selected.origin} />
          </div>
        </div>

        {!isOldest && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
            <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-amber-800 text-xs">
              This is not the oldest lot. FIFO recommends dispatching <strong>{activeLots[0]?.riceType}</strong> ({activeLots[0]?.lotNumber}) first.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <Label>Dispatched To *</Label>
            <input className="mob-input" value={dispatchedTo} onChange={e => setDispatchedTo(e.target.value)} placeholder="Buyer / retailer" />
          </div>
          <div>
            <Label>Delivery Order / Reference *</Label>
            <input className="mob-input" value={ref} onChange={e => setRef(e.target.value)} placeholder="DO/PO reference" />
          </div>
          <div>
            <Label>Notes (optional)</Label>
            <textarea className="mob-input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>

        <button
          onClick={confirm}
          disabled={!dispatchedTo.trim() || !ref.trim() || saving}
          className="w-full bg-green-700 text-white py-3.5 rounded-xl font-semibold flex items-center justify-center gap-2 active:bg-green-800 disabled:opacity-50"
        >
          {saving ? 'Dispatching…' : <><Truck size={18} /> Confirm Checkout</>}
        </button>
      </div>
    );
  }

  // List screen
  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Checkout</h1>
      <p className="text-sm text-gray-500 -mt-2">Tap a lot to dispatch · FIFO order (oldest first)</p>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          className="mob-input pl-9"
          placeholder="Search lot, rice, supplier…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {filtered.map((lot) => {
          const days = differenceInDays(new Date(), parseISO(lot.dateIn));
          const cat = getAgeCategory(lot.dateIn);
          const slot = data.slots.find(s => s.id === lot.slotId);
          const rank = activeLots.indexOf(lot);
          return (
            <button
              key={lot.id}
              onClick={() => setSelected(lot)}
              className="w-full bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3 text-left active:bg-gray-50"
            >
              <div
                className="w-11 h-11 rounded-xl flex flex-col items-center justify-center text-white shrink-0"
                style={{ background: ageCategoryColor(cat) }}
              >
                <span className="font-bold text-sm leading-none">{days}</span>
                <span className="text-[9px] leading-none mt-0.5">days</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-gray-900 truncate">{lot.riceType}</p>
                  {rank === 0 && <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold shrink-0">FIFO</span>}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{lot.lotNumber} · {slot?.label}</p>
                <p className="text-[11px] text-gray-400 truncate">{lot.quantity} bags · {numberWithCommas(lot.totalWeight)} kg</p>
              </div>
              <PackageMinus size={18} className="text-gray-300 shrink-0" />
            </button>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <PackageMinus size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No active lots to dispatch</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-gray-500 mb-1.5">{children}</label>;
}
function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <p className="text-gray-400 text-[11px]">{label}</p>
      <p className="font-medium text-gray-900 truncate">{value}</p>
    </div>
  );
}
