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

  // Build grid
  const grid: StorageSlot[][] = useMemo(() => {
    const rows: StorageSlot[][] = [];
    for (let r = 0; r < config.rows; r++) {
      rows.push([]);
      for (let c = 0; c < config.cols; c++) {
        const s = slots.find(s => s.row === r && s.col === c);
        if (s) rows[r].push(s);
      }
    }
    return rows;
  }, [slots, config]);

  const selectedLot = selectedSlot?.lotId ? lotMap.get(selectedSlot.lotId) : undefined;

  function getSlotColor(slot: StorageSlot): string {
    if (slot.status === 'empty') return '#f3f4f6';
    if (slot.status === 'maintenance') return '#fef9c3';
    if (slot.status === 'reserved') return '#dbeafe';
    const lot = slot.lotId ? lotMap.get(slot.lotId) : undefined;
    if (!lot) return '#e5e7eb';
    return ageCategoryColor(getAgeCategory(lot.dateIn));
  }

  function getSlotBorder(slot: StorageSlot): string {
    if (selectedSlot?.id === slot.id) return '#1d4ed8';
    if (slot.status === 'empty') return '#d1d5db';
    if (slot.status === 'maintenance') return '#ca8a04';
    return 'transparent';
  }

  const filteredSlotIds = useMemo(() => {
    if (filter === 'all') return null;
    return new Set(slots.filter(s => s.status === filter).map(s => s.id));
  }, [slots, filter]);

  const counts = useMemo(() => ({
    occupied: slots.filter(s => s.status === 'occupied').length,
    empty: slots.filter(s => s.status === 'empty').length,
    maintenance: slots.filter(s => s.status === 'maintenance').length,
    reserved: slots.filter(s => s.status === 'reserved').length,
  }), [slots]);

  const cellSize = Math.round(48 * zoom);

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Warehouse View</h1>
          <p className="text-sm text-gray-500">{config.rows} rows × {config.cols} columns = {config.rows * config.cols} total slots</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.25))} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50">
            <ZoomOut size={16} />
          </button>
          <span className="text-sm text-gray-600 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(z => Math.min(2, z + 0.25))} className="p-2 rounded-lg bg-white border border-gray-200 hover:bg-gray-50">
            <ZoomIn size={16} />
          </button>
        </div>
      </div>

      {/* Filters & Legend */}
      <div className="flex flex-wrap items-center gap-3">
        {(['all', 'occupied', 'empty', 'maintenance'] as Filter[]).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${filter === f ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== 'all' && <span className="ml-1.5 text-xs opacity-75">({counts[f as keyof typeof counts]})</span>}
          </button>
        ))}
        <div className="flex-1" />
        {/* Age legend */}
        <div className="flex items-center gap-2 flex-wrap">
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
              <span className="w-3 h-3 rounded-sm border" style={{ background: l.color, borderColor: l.border ?? l.color }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 overflow-auto">
        {/* Column headers */}
        <div className="flex mb-1" style={{ paddingLeft: `${cellSize * 0.75}px` }}>
          <div style={{ width: cellSize * 0.75 }} />
          {grid[0]?.map((_, ci) => (
            <div key={ci} className="text-center text-xs text-gray-400 font-medium" style={{ width: cellSize + 2, marginRight: 2 }}>
              {ci + 1}
            </div>
          ))}
        </div>

        <div className="space-y-0.5">
          {grid.map((row, ri) => (
            <div key={ri} className="flex items-center gap-0.5">
              {/* Row label */}
              <div className="text-xs text-gray-400 font-medium text-right pr-1.5 shrink-0" style={{ width: cellSize * 0.75 }}>
                {String.fromCharCode(65 + ri)}
              </div>
              {row.map(slot => {
                const isFiltered = filteredSlotIds && !filteredSlotIds.has(slot.id);
                const lot = slot.lotId ? lotMap.get(slot.lotId) : undefined;
                return (
                  <button
                    key={slot.id}
                    onClick={() => setSelectedSlot(slot)}
                    title={`${slot.label} — ${slot.status}${lot ? ` · ${lot.riceType} · ${ageLabel(lot.dateIn)}` : ''}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                      background: isFiltered ? '#f9fafb' : getSlotColor(slot),
                      border: `2px solid ${getSlotBorder(slot)}`,
                      opacity: isFiltered ? 0.3 : 1,
                      borderRadius: 4,
                      transition: 'all 0.1s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                    className="hover:opacity-80 hover:scale-105"
                  >
                    {slot.status === 'occupied' && lot && zoom >= 0.75 && (
                      <span className="text-white text-center font-bold leading-none" style={{ fontSize: Math.max(7, cellSize * 0.2) }}>
                        {ageLabel(lot.dateIn)}
                      </span>
                    )}
                    {slot.status === 'maintenance' && zoom >= 0.75 && (
                      <Wrench size={Math.max(8, cellSize * 0.3)} className="text-yellow-700" />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Slot Detail Modal */}
      {selectedSlot && (
        <Modal title={`Slot ${selectedSlot.label}`} onClose={() => setSelectedSlot(null)} size="md">
          <SlotDetail slot={selectedSlot} lot={selectedLot} canEdit={currentUser?.role !== 'viewer'}
            onMaintenanceToggle={(m) => { setSlotMaintenance(selectedSlot.id, m); setSelectedSlot(null); }} />
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
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: lot ? ageCategoryColor(getAgeCategory(lot.dateIn)) : slot.status === 'maintenance' ? '#fef9c3' : '#f3f4f6' }}>
          {slot.status === 'occupied' ? <Package size={20} className="text-white" /> :
            slot.status === 'maintenance' ? <Wrench size={20} className="text-yellow-700" /> :
              <CheckCircle size={20} className="text-gray-400" />}
        </div>
        <div>
          <p className="font-semibold text-gray-900">{slot.label}</p>
          <p className="text-sm text-gray-500 capitalize">{slot.status}</p>
        </div>
      </div>

      {lot ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Lot Number" value={lot.lotNumber} />
            <Field label="Rice Type" value={lot.riceType} />
            <Field label="Grade" value={lot.grade} />
            <Field label="Supplier" value={lot.supplier} />
            <Field label="Origin" value={lot.origin} />
            <Field label="Date In" value={formatDate(lot.dateIn)} />
            <Field label="Expiry Date" value={formatDate(lot.expiryDate)} />
            <Field label="Quantity" value={`${numberWithCommas(lot.quantity)} bags`} />
            <Field label="Total Weight" value={`${numberWithCommas(lot.totalWeight)} kg`} />
            <Field label="Moisture" value={`${lot.moisture}%`} />
            <Field label="Temperature" value={`${lot.temperature}°C`} />
            <Field label="Status" value={lot.status} />
          </div>
          {cat && (
            <div className="p-3 rounded-lg text-sm font-medium text-center text-white" style={{ background: ageCategoryColor(cat) }}>
              Age: {days} days — {cat.toUpperCase()} (FIFO Priority {cat === 'critical' || cat === 'caution' ? '🔴 High' : cat === 'warning' ? '🟡 Medium' : '🟢 Low'})
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6 text-gray-400">
          <Info size={24} className="mx-auto mb-2" />
          <p className="text-sm">{slot.status === 'maintenance' ? 'Slot under maintenance' : 'Slot is empty and available'}</p>
          {canEdit && slot.status !== 'occupied' && (
            <button
              onClick={() => onMaintenanceToggle(slot.status !== 'maintenance')}
              className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${slot.status === 'maintenance' ? 'bg-green-600 text-white' : 'bg-yellow-500 text-white'}`}
            >
              {slot.status === 'maintenance' ? 'Mark Available' : 'Mark as Maintenance'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-900">{value}</p>
    </div>
  );
}
