import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, AlertTriangle, Eye, Edit2, Truck } from 'lucide-react';
import { differenceInDays, parseISO } from 'date-fns';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import type { ContainerLot } from '../types';
import { getAgeCategory, ageCategoryText, formatDate, numberWithCommas } from '../utils/helpers';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';

type TabType = 'active' | 'dispatched' | 'quarantine' | 'all';

export default function ContainerLogPage() {
  const nav = useNavigate();
  const { data, dispatchLot, quarantineLot } = useAppStore();
  const { currentUser } = useAuth();

  const [tab, setTab] = useState<TabType>('active');
  const [search, setSearch] = useState('');
  const [riceFilter, setRiceFilter] = useState('');
  const [viewLot, setViewLot] = useState<ContainerLot | null>(null);
  const [dispatchModal, setDispatchModal] = useState<ContainerLot | null>(null);

  const filteredLots = useMemo(() => {
    return data.lots
      .filter(l => tab === 'all' ? true : l.status === tab)
      .filter(l => {
        if (!search) return true;
        const q = search.toLowerCase();
        return l.lotNumber.toLowerCase().includes(q) || l.supplier.toLowerCase().includes(q)
          || l.riceType.toLowerCase().includes(q) || l.origin.toLowerCase().includes(q)
          || l.invoiceNumber.toLowerCase().includes(q);
      })
      .filter(l => !riceFilter || l.riceType === riceFilter)
      .sort((a, b) => a.dateIn.localeCompare(b.dateIn)); // FIFO order
  }, [data.lots, tab, search, riceFilter]);

  const riceTypes = useMemo(() => [...new Set(data.lots.map(l => l.riceType))], [data.lots]);

  const canEdit = currentUser?.role !== 'viewer';

  const tabCounts = useMemo(() => ({
    active: data.lots.filter(l => l.status === 'active').length,
    dispatched: data.lots.filter(l => l.status === 'dispatched').length,
    quarantine: data.lots.filter(l => l.status === 'quarantine').length,
    all: data.lots.length,
  }), [data.lots]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Container Log</h1>
          <p className="text-sm text-gray-500">Sorted in FIFO order (oldest first)</p>
        </div>
        {canEdit && (
          <button onClick={() => nav('/containers/new')} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
            <Plus size={16} /> Log New Container
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['active', 'quarantine', 'dispatched', 'all'] as TabType[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
            <span className="ml-1.5 text-xs text-gray-400">({tabCounts[t]})</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Search lot, supplier, invoice…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-48" value={riceFilter} onChange={e => setRiceFilter(e.target.value)}>
          <option value="">All rice types</option>
          {riceTypes.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">FIFO#</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Lot / Slot</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Rice Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Qty / Weight</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date In</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Age / Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLots.map((lot, idx) => {
                const slot = data.slots.find(s => s.id === lot.slotId);
                const days = lot.status === 'active' ? differenceInDays(new Date(), parseISO(lot.dateIn)) : null;
                const cat = lot.status === 'active' ? getAgeCategory(lot.dateIn) : null;
                return (
                  <tr key={lot.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      {lot.status === 'active' && (
                        <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-900">{lot.lotNumber}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Package size={11} /> {slot?.label ?? '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{lot.riceType}</p>
                      <p className="text-xs text-gray-500">{lot.grade}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-800">{lot.supplier}</p>
                      <p className="text-xs text-gray-500">{lot.supplierCountry}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-medium text-gray-900">{numberWithCommas(lot.quantity)} bags</p>
                      <p className="text-xs text-gray-500">{numberWithCommas(lot.totalWeight)} kg</p>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{formatDate(lot.dateIn)}</td>
                    <td className="px-4 py-3">
                      {lot.status === 'active' && cat && (
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${ageCategoryText(cat)}`}>
                          {days}d — {cat}
                        </span>
                      )}
                      {lot.status === 'dispatched' && <Badge label="Dispatched" color="blue" />}
                      {lot.status === 'quarantine' && <Badge label="Quarantine" color="orange" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => setViewLot(lot)} title="View" className="p-1.5 rounded hover:bg-gray-100 text-gray-500">
                          <Eye size={15} />
                        </button>
                        {canEdit && lot.status === 'active' && (
                          <>
                            <button onClick={() => nav(`/containers/new?edit=${lot.id}`)} title="Edit" className="p-1.5 rounded hover:bg-gray-100 text-blue-500">
                              <Edit2 size={15} />
                            </button>
                            <button onClick={() => setDispatchModal(lot)} title="Dispatch" className="p-1.5 rounded hover:bg-gray-100 text-green-600">
                              <Truck size={15} />
                            </button>
                            <button onClick={() => { if (window.confirm('Mark as quarantine?')) quarantineLot(lot.id, 'Quality issue flagged', currentUser!); }} title="Quarantine" className="p-1.5 rounded hover:bg-gray-100 text-orange-500">
                              <AlertTriangle size={15} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredLots.length === 0 && (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400">
                    <Package size={32} className="mx-auto mb-2 opacity-40" />
                    <p>No containers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Modal */}
      {viewLot && (
        <Modal title={`Lot: ${viewLot.lotNumber}`} onClose={() => setViewLot(null)} size="lg">
          <LotDetail lot={viewLot} slot={data.slots.find(s => s.id === viewLot.slotId)?.label} />
        </Modal>
      )}

      {/* Dispatch Modal */}
      {dispatchModal && (
        <DispatchModal
          lot={dispatchModal}
          onClose={() => setDispatchModal(null)}
          onDispatch={(d, r, n) => {
            dispatchLot(dispatchModal.id, { dispatchedTo: d, dispatchRef: r, notes: n }, currentUser!);
            setDispatchModal(null);
          }}
        />
      )}
    </div>
  );
}

function LotDetail({ lot, slot }: { lot: ContainerLot; slot?: string }) {
  const rows: [string, string][] = [
    ['Lot Number', lot.lotNumber],
    ['Slot', slot ?? '—'],
    ['Rice Type', lot.riceType],
    ['Grade', lot.grade],
    ['Status', lot.status],
    ['Supplier', lot.supplier],
    ['Country', lot.supplierCountry],
    ['Origin', lot.origin],
    ['Quantity', `${lot.quantity} bags`],
    ['Weight/Bag', `${lot.weightPerUnit} kg`],
    ['Total Weight', `${numberWithCommas(lot.totalWeight)} kg`],
    ['Date In', formatDate(lot.dateIn)],
    ['Expiry', formatDate(lot.expiryDate)],
    ['Temperature', `${lot.temperature}°C`],
    ['Moisture', `${lot.moisture}%`],
    ['Batch No.', lot.batchNumber],
    ['Invoice No.', lot.invoiceNumber],
    ['DO Number', lot.doNumber],
    ['Vehicle', lot.vehicleNumber],
    ['Received By', lot.receivedBy],
    ...(lot.dateOut ? [['Date Out', formatDate(lot.dateOut)] as [string, string]] : []),
    ...(lot.dispatchedTo ? [['Dispatched To', lot.dispatchedTo] as [string, string]] : []),
    ...(lot.dispatchRef ? [['Dispatch Ref', lot.dispatchRef] as [string, string]] : []),
    ...(lot.notes ? [['Notes', lot.notes] as [string, string]] : []),
  ];
  return (
    <div className="grid grid-cols-2 gap-x-8 gap-y-3">
      {rows.map(([label, value]) => (
        <div key={label}>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-sm font-medium text-gray-900">{value}</p>
        </div>
      ))}
    </div>
  );
}

function DispatchModal({ lot, onClose, onDispatch }: {
  lot: ContainerLot; onClose: () => void; onDispatch: (d: string, r: string, n: string) => void;
}) {
  const [to, setTo] = useState('');
  const [ref, setRef] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <Modal title={`Dispatch: ${lot.lotNumber}`} onClose={onClose} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-600">
          {lot.riceType} · {lot.quantity} bags · {numberWithCommas(lot.totalWeight)} kg
        </p>
        <div>
          <label className="label">Dispatched To *</label>
          <input className="input" value={to} onChange={e => setTo(e.target.value)} placeholder="Buyer / retailer name" />
        </div>
        <div>
          <label className="label">Delivery Order / Reference *</label>
          <input className="input" value={ref} onChange={e => setRef(e.target.value)} placeholder="DO/PO reference" />
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea className="input resize-none" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button
            onClick={() => { if (to && ref) onDispatch(to, ref, notes); }}
            disabled={!to || !ref}
            className="btn-primary text-sm disabled:opacity-50"
          >
            Confirm Dispatch
          </button>
        </div>
      </div>
    </Modal>
  );
}
