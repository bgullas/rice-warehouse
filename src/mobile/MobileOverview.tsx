import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInDays, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';
import {
  Package, Wheat, AlertTriangle, TrendingUp, TrendingDown, Clock, ChevronRight, Boxes, Droplets,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAgeCategory, ageCategoryColor, numberWithCommas, formatDate } from '../utils/helpers';

export default function MobileOverview() {
  const { data } = useAppStore();
  const nav = useNavigate();

  const activeLots = useMemo(() => data.lots.filter(l => l.status === 'active'), [data.lots]);
  const occupied = data.slots.filter(s => s.status === 'occupied').length;
  const totalSlots = data.slots.length;
  const totalWeight = activeLots.reduce((s, l) => s + l.totalWeight, 0);
  const totalBags = activeLots.reduce((s, l) => s + l.quantity, 0);
  const occupancyPct = totalSlots ? Math.round((occupied / totalSlots) * 100) : 0;

  const oldest = useMemo(() => {
    if (!activeLots.length) return null;
    return activeLots.reduce((o, l) => (l.dateIn < o.dateIn ? l : o));
  }, [activeLots]);
  const oldestDays = oldest ? differenceInDays(new Date(), parseISO(oldest.dateIn)) : 0;

  // Movement counters
  const movement = useMemo(() => {
    const acc = {
      dayIn: 0, dayOut: 0, weekIn: 0, weekOut: 0, monthIn: 0, monthOut: 0,
    };
    data.transactions.forEach(t => {
      let d: Date;
      try { d = parseISO(t.timestamp); } catch { return; }
      const w = t.weight;
      const isIn = t.type === 'IN';
      const isOut = t.type === 'OUT';
      if (isToday(d)) { if (isIn) acc.dayIn += w; if (isOut) acc.dayOut += w; }
      if (isThisWeek(d, { weekStartsOn: 1 })) { if (isIn) acc.weekIn += w; if (isOut) acc.weekOut += w; }
      if (isThisMonth(d)) { if (isIn) acc.monthIn += w; if (isOut) acc.monthOut += w; }
    });
    return acc;
  }, [data.transactions]);

  // Age buckets
  const ageBuckets = useMemo(() => {
    const b = { fresh: 0, good: 0, warning: 0, caution: 0, critical: 0 };
    activeLots.forEach(l => { b[getAgeCategory(l.dateIn)]++; });
    return b;
  }, [activeLots]);

  const avgMoisture = activeLots.length
    ? (activeLots.reduce((s, l) => s + l.moisture, 0) / activeLots.length).toFixed(1)
    : '—';

  const fifoQueue = useMemo(
    () => [...activeLots].sort((a, b) => a.dateIn.localeCompare(b.dateIn)).slice(0, 5),
    [activeLots]
  );

  const t = (kg: number) => (kg / 1000).toFixed(kg >= 1000 ? 1 : 2);

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900">Overview</h1>

      {/* FIFO alert */}
      {oldestDays > 90 && oldest && (
        <button
          onClick={() => nav('/m/checkout')}
          className="w-full bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-left active:bg-red-100"
        >
          <AlertTriangle className="text-red-600 shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <p className="text-red-800 font-semibold text-sm">Dispatch oldest lot</p>
            <p className="text-red-700 text-xs truncate">
              {oldest.lotNumber} · {oldest.riceType} · {oldestDays} days
            </p>
          </div>
          <ChevronRight size={18} className="text-red-400 shrink-0" />
        </button>
      )}

      {/* Hero stat */}
      <div className="bg-green-900 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <span className="text-green-300 text-sm">Total Stockpile</span>
          <Wheat size={18} className="text-green-400" />
        </div>
        <p className="text-3xl font-bold">{numberWithCommas(totalWeight / 1000)} MT</p>
        <p className="text-green-300 text-sm mt-0.5">{numberWithCommas(totalBags)} bags · {activeLots.length} active lots</p>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-green-300 mb-1">
            <span>Occupancy</span>
            <span>{occupied}/{totalSlots} slots ({occupancyPct}%)</span>
          </div>
          <div className="w-full bg-green-950 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full ${occupancyPct >= 90 ? 'bg-red-400' : occupancyPct >= 70 ? 'bg-orange-400' : 'bg-green-400'}`}
              style={{ width: `${occupancyPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-3">
        <MiniCard icon={<Package size={16} className="text-green-600" />} label="Active Lots" value={activeLots.length.toString()} />
        <MiniCard icon={<Boxes size={16} className="text-blue-600" />} label="Empty Slots" value={(totalSlots - occupied).toString()} />
        <MiniCard icon={<Droplets size={16} className="text-sky-600" />} label="Avg Moisture" value={`${avgMoisture}%`} />
        <MiniCard icon={<Clock size={16} className="text-orange-600" />} label="Oldest Lot" value={`${oldestDays}d`} />
      </div>

      {/* Movement */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Movement (tonnes)</h2>
        <div className="space-y-2.5">
          {[
            { label: 'Today', in: movement.dayIn, out: movement.dayOut },
            { label: 'This Week', in: movement.weekIn, out: movement.weekOut },
            { label: 'This Month', in: movement.monthIn, out: movement.monthOut },
          ].map(row => (
            <div key={row.label} className="flex items-center justify-between">
              <span className="text-sm text-gray-600">{row.label}</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                  <TrendingUp size={14} /> {t(row.in)}
                </span>
                <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                  <TrendingDown size={14} /> {t(row.out)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Age distribution bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="font-semibold text-gray-800 text-sm mb-3">Age Distribution (FIFO)</h2>
        <div className="flex w-full h-5 rounded-full overflow-hidden mb-3">
          {([
            ['fresh', ageBuckets.fresh],
            ['good', ageBuckets.good],
            ['warning', ageBuckets.warning],
            ['caution', ageBuckets.caution],
            ['critical', ageBuckets.critical],
          ] as const).map(([cat, count]) =>
            count > 0 ? (
              <div
                key={cat}
                className="flex items-center justify-center text-[10px] text-white font-bold"
                style={{ background: ageCategoryColor(cat), flex: count }}
              >
                {count}
              </div>
            ) : null
          )}
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {([
            ['≤30d', 'fresh'], ['31-60d', 'good'], ['61-90d', 'warning'],
            ['91-120d', 'caution'], ['>120d', 'critical'],
          ] as const).map(([label, cat]) => (
            <div key={cat} className="flex items-center gap-1 text-[11px] text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: ageCategoryColor(cat) }} />
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* FIFO queue */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800 text-sm flex items-center gap-1.5">
            <Clock size={15} className="text-gray-500" /> Dispatch Queue
          </h2>
          <button onClick={() => nav('/m/checkout')} className="text-green-700 text-xs font-medium">View all</button>
        </div>
        <div className="space-y-2">
          {fifoQueue.map((lot, i) => {
            const days = differenceInDays(new Date(), parseISO(lot.dateIn));
            const cat = getAgeCategory(lot.dateIn);
            const slot = data.slots.find(s => s.id === lot.slotId);
            return (
              <button
                key={lot.id}
                onClick={() => nav(`/m/checkout?lot=${lot.id}`)}
                className="w-full flex items-center gap-2.5 p-2 rounded-lg active:bg-gray-50 text-left"
              >
                <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold shrink-0">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{lot.riceType}</p>
                  <p className="text-[11px] text-gray-500 truncate">{slot?.label} · {formatDate(lot.dateIn)}</p>
                </div>
                <span
                  className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white shrink-0"
                  style={{ background: ageCategoryColor(cat) }}
                >
                  {days}d
                </span>
              </button>
            );
          })}
          {fifoQueue.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">No active lots</p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3">
      <div className="flex items-center gap-1.5 mb-1.5">{icon}<span className="text-[11px] text-gray-500">{label}</span></div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
