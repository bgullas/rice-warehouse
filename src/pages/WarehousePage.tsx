import { useState, useMemo } from 'react';
import { differenceInDays, parseISO } from 'date-fns';
import { ZoomIn, ZoomOut, Info, CheckCircle, Wrench, Package } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAgeCategory, ageCategoryColor, ageLabel, formatDate, numberWithCommas } from '../utils/helpers';
import type { ContainerLot, StorageSlot } from '../types';
import Modal from '../components/common/Modal';
import { useAuth } from '../contexts/AuthContext';

type Filter = 'all' | 'occupied' | 'empty' | 'maintenance';

export default function WarehousePage() {
  const { data, setSlotMaintenance } = useAppStore();
  const { currentUser } = useAuth();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedSlot, setSelectedSlot] = useState<StorageSlot | null>(null);
  const [zoom, setZoom] = useState(1);

  const { config, slots, lots } = data;

  const lotMap = useMemo(() => {
    const m = new Map<string, ContainerLot>();
    lots.forEach(l => m.set(l.id, l));
    return m;
  }, [lots]);

  const grid: StorageSlot[][] = useMemo(() => {
    const rows: StorageSlot[][] = [];
    for (let r = 0; r < config.rows; r++) {
      const row: StorageSlot[] = [];
      for (let c = 0; c < config.cols; c++) {
        const s = slots.find(s => s.row === r && s.col === c);
        if (s) row.push(s);
      }
      if (row.length > 0) rows.push(row);
    }
    return rows;
  }, [slots, config]);

  const selectedLot = selectedSlot?.lotId ? lotMap.get(selectedSlot.lotId) : undefined;

  function getSlotBg(slot: StorageSlot): string {
    if (slot.status === 'empty') return '#f3f4f6';
    if (slot.status === 'maintenance') return '#fef9c3';
    if (slot.status === 'reserved') return '#dbeafe';
    const lot = slot.lotId ? lotMap.get(slot.lotId) : undefined;
    if (!lot) return '#e5e7eb';
    return ageCategoryColor(getAgeCategory(lot.dateIn));
  }

  const filteredIds = useMemo(() => {
    if (filter === 'all') return null;
    return new Set(slots.filter(s => s.status === filter).map(s => s.id));
  }, [slots, filter]);

  const counts = useMemo(() => ({
    occupied: slots.filter(s => s.status === 'occupied').length,
    empty: slots.filter(s => s.status === 'empty').length,
    maintenance: slots.filter(s => s.status === 'maintenance').length,
  }), [slots]);

  // Cell dimensions — tall rectangles
  const cellW = Math.round(160 * zoom);
  const cellH = Math.round(80 * zoom);
  const gap = Math.round(10 * zoom);
  const fontSize = {
    age: Math.max(13, Math.round(18 * zoom)),
    rice: Math.max(9, Math.round(11 * zoom)),
    label: Math.max(9, Math.round(11 * zoom)),
  };

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse View</h1>
          <p className="text-sm text-gray-500">{config.rows} rows × {config.cols} columns = {config.rows * config.cols} total slots</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.4, +(z - 0.2).toFixed(1)))} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"><ZoomOut size={16} /></button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, +(z + 0.2).toFixed(1)))} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50"><ZoomIn size={16} /></button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {(['all', 'occupied', 'empty', 'maintenance'] as Filter[]).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === f ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span className="ml-1.5 opacity-75">({counts[f as keyof typeof counts] ?? 0})</span>}
          </button>
        ))}
        <div className="flex-1" />
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          {[
            { label: '≤30d', color: '#16a34a' },
            { label: '31-60d', color: '#65a30d' },
            { label: '61-90d', color: '#ca8a04' },
            { label: '91-120d', color: '#ea580c' },
            { label: '>120d', color: '#dc2626' },
            { label: 'Empty', color: '#f3f4f6', border: '#d1d5db' },
            { label: 'Maint.', color: '#fef9c3', border: '#ca8a04' },
          ].map(l => (
            <div key={l.label} className="flex items-center gap-1 text-xs text-gray-600">
              <span className="w-3 h-3 rounded-sm border inline-block" style={{ background: l.color, borderColor: l.border ?? l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 overflow-auto">
        {/* Column headers */}
        <div className="flex mb-2" style={{ gap }}>
          {grid[0]?.map((_, ci) => (
            <div key={ci}
              className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest"
              style={{ width: cellW }}>
              Column {ci + 1}
            </div>
          ))}
        </div>

        <div className="flex flex-col" style={{ gap }}>
          {grid.map((row, ri) => (
            <div key={ri} className="flex" style={{ gap }}>
              {row.map(slot => {
                const dimmed = filteredIds && !filteredIds.has(slot.id);
                const lot = slot.lotId ? lotMap.get(slot.lotId) : undefined;
                const isSelected = selectedSlot?.id === slot.id;

                return (
                  <div key={slot.id} className="flex flex-col items-center" style={{ width: cellW }}>
                    <button
                      onClick={() => setSelectedSlot(slot)}
                      title={`${slot.label}${lot ? ` · ${lot.riceType} · ${ageLabel(lot.dateIn)}` : ` · ${slot.status}`}`}
                      style={{
                        width: cellW,
                        height: cellH,
                        background: getSlotBg(slot),
                        border: `2px solid ${isSelected ? '#1d4ed8' : slot.status === 'maintenance' ? '#ca8a04' : slot.status === 'empty' ? '#e5e7eb' : 'transparent'}`,
                        borderRadius: 8,
                        opacity: dimmed ? 0.25 : 1,
                        transition: 'all 0.12s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        boxShadow: isSelected ? '0 0 0 3px rgba(29,78,216,0.25)' : slot.status === 'occupied' ? '0 1px 4px rgba(0,0,0,0.15)' : 'none',
                      }}
                      className="hover:brightness-95 hover:scale-[1.02] transition-all"
                    >
                      {slot.status === 'occupied' && lot && (
                        <>
                          <span className="font-bold text-white drop-shadow-sm leading-tight"
                            style={{ fontSize: fontSize.age }}>
                            {ageLabel(lot.dateIn)}
                          </span>
                          {zoom >= 0.6 && (
                            <span className="text-white/90 text-center leading-tight mt-1 line-clamp-2"
                              style={{ fontSize: fontSize.rice }}>
                              {lot.riceType}
                            </span>
                          )}
                        </>
                      )}
                      {slot.status === 'maintenance' && (
                        <div className="flex flex-col items-center gap-1">
                          <Wrench size={Math.max(14, cellH * 0.28)} className="text-yellow-700" />
                          {zoom >= 0.7 && <span className="text-yellow-800 font-medium" style={{ fontSize: fontSize.rice }}>Maintenance</span>}
                        </div>
                      )}
                      {slot.status === 'empty' && zoom >= 0.8 && (
                        <span className="text-gray-300 font-medium" style={{ fontSize: fontSize.rice }}>empty</span>
                      )}
                    </button>

                    {/* Slot label OUTSIDE below the cell */}
                    <span
                      className="font-mono font-semibold text-gray-500 mt-1.5 text-center select-none"
                      style={{ fontSize: fontSize.label }}
                    >
                      {slot.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Slot Detail Modal */}
      {selectedSlot && (
        <Modal title={`Slot ${selectedSlot.label}`} onClose={() => setSelectedSlot(null)} size="md">
          <SlotDetail
            slot={selectedSlot}
            lot={selectedLot}
            canEdit={currentUser?.role !== 'viewer'}
            onMaintenanceToggle={m => { setSlotMaintenance(selectedSlot.id, m); setSelectedSlot(null); }}
          />
        </Modal>
      )}
    </div>
  );
}

function SlotDetail({ slot, lot, canEdit, onMaintenanceToggle }: {
  slot: StorageSlot; lot?: ContainerLot; canEdit: boolean; onMaintenanceToggle: (m: boolean) => void;
}) {
  const days = lot ? differenceInDays(new Date(), parseISO(lot.dateIn)) : 0;
  const cat = lot ? getAgeCategory(lot.dateIn) : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: lot ? ageCategoryColor(getAgeCategory(lot.dateIn)) : slot.status === 'maintenance' ? '#fef9c3' : '#f3f4f6' }}>
          {slot.status === 'occupied'
            ? <Package size={22} className="text-white" />
            : slot.status === 'maintenance'
            ? <Wrench size={22} className="text-yellow-700" />
            : <CheckCircle size={22} className="text-gray-400" />}
        </div>
        <div>
          <p className="font-bold text-gray-900 text-lg">{slot.label}</p>
          <p className="text-sm text-gray-500 capitalize">{slot.status}</p>
        </div>
      </div>

      {lot ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {([
              ['Lot Number', lot.lotNumber],
              ['Rice Type', lot.riceType],
              ['Grade', lot.grade],
              ['Supplier', lot.supplier],
              ['Country', lot.supplierCountry],
              ['Origin', lot.origin],
              ['Date In', formatDate(lot.dateIn)],
              ['Expiry Date', formatDate(lot.expiryDate)],
              ['Quantity', `${numberWithCommas(lot.quantity)} bags`],
              ['Total Weight', `${numberWithCommas(lot.totalWeight)} kg`],
              ['Moisture', `${lot.moisture}%`],
              ['Temperature', `${lot.temperature}°C`],
              ['Invoice No.', lot.invoiceNumber],
              ['DO Number', lot.doNumber],
              ['Vehicle', lot.vehicleNumber],
              ['Received By', lot.receivedBy],
            ] as [string, string][]).map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-gray-400">{label}</p>
                <p className="text-sm font-medium text-gray-900">{value}</p>
              </div>
            ))}
          </div>
          {lot.notes && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-800">
              <span className="font-medium">Note: </span>{lot.notes}
            </div>
          )}
          {cat && (
            <div className="p-3 rounded-lg text-sm font-semibold text-center text-white"
              style={{ background: ageCategoryColor(cat) }}>
              Age: {days} days — {cat.toUpperCase()}
              {cat === 'critical' ? ' 🔴 Dispatch immediately (FIFO)' : cat === 'caution' ? ' 🟠 Dispatch soon' : cat === 'warning' ? ' 🟡 Monitor' : ' 🟢 Good'}
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400">
          <Info size={28} className="mx-auto mb-2" />
          <p className="text-sm">{slot.status === 'maintenance' ? 'Slot under maintenance — not available for stock' : 'Slot is empty and available for stock'}</p>
          {canEdit && slot.status !== 'occupied' && (
            <button
              onClick={() => onMaintenanceToggle(slot.status !== 'maintenance')}
              className={`mt-4 px-5 py-2 rounded-lg text-sm font-medium ${slot.status === 'maintenance' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-yellow-500 text-white hover:bg-yellow-600'}`}>
              {slot.status === 'maintenance' ? 'Mark as Available' : 'Mark as Maintenance'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
