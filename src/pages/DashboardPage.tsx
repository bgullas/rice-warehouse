import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { format, parseISO, subDays, subWeeks, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval } from 'date-fns';
import { Package, AlertTriangle, Wheat, Thermometer, Droplets, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getAgeCategory, ageCategoryColor, numberWithCommas, formatDate } from '../utils/helpers';
import { differenceInDays } from 'date-fns';

type Period = 'daily' | 'weekly' | 'monthly';

const AGE_COLORS: Record<string, string> = {
  fresh: '#16a34a', good: '#65a30d', warning: '#ca8a04', caution: '#ea580c', critical: '#dc2626',
};

export default function DashboardPage() {
  const { data } = useAppStore();
  const [period, setPeriod] = useState<Period>('daily');

  const activeLots = useMemo(() => data.lots.filter(l => l.status === 'active'), [data.lots]);
  const occupiedSlots = useMemo(() => data.slots.filter(s => s.status === 'occupied').length, [data.slots]);
  const totalSlots = data.slots.length;
  const totalWeight = useMemo(() => activeLots.reduce((s, l) => s + l.totalWeight, 0), [activeLots]);
  const totalBags = useMemo(() => activeLots.reduce((s, l) => s + l.quantity, 0), [activeLots]);

  // FIFO compliance - oldest lot
  const oldestLot = useMemo(() => {
    if (!activeLots.length) return null;
    return activeLots.reduce((o, l) => l.dateIn < o.dateIn ? l : o);
  }, [activeLots]);
  const oldestDays = oldestLot ? differenceInDays(new Date(), parseISO(oldestLot.dateIn)) : 0;

  // Age distribution
  const ageDist = useMemo(() => {
    const counts: Record<string, number> = { fresh: 0, good: 0, warning: 0, caution: 0, critical: 0 };
    activeLots.forEach(l => { counts[getAgeCategory(l.dateIn)]++; });
    return Object.entries(counts).map(([cat, value]) => ({ name: cat, value, color: AGE_COLORS[cat] }));
  }, [activeLots]);

  // Rice type distribution
  const riceTypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    activeLots.forEach(l => { map[l.riceType] = (map[l.riceType] ?? 0) + l.totalWeight; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [activeLots]);

  // Movement chart
  const movementData = useMemo(() => {
    const now = new Date();
    const txs = data.transactions;

    if (period === 'daily') {
      const days = eachDayOfInterval({ start: subDays(now, 29), end: now });
      return days.map(d => {
        const label = format(d, 'dd MMM');
        const dayStr = format(d, 'yyyy-MM-dd');
        const ins = txs.filter(t => t.type === 'IN' && t.timestamp.startsWith(dayStr)).reduce((s, t) => s + t.weight, 0);
        const outs = txs.filter(t => t.type === 'OUT' && t.timestamp.startsWith(dayStr)).reduce((s, t) => s + t.weight, 0);
        return { label, in: ins / 1000, out: outs / 1000 };
      });
    }
    if (period === 'weekly') {
      const weeks = eachWeekOfInterval({ start: subWeeks(now, 11), end: now });
      return weeks.map(w => {
        const label = 'W' + format(w, 'ww');
        const wStr = format(w, 'yyyy-\'W\'ww');
        const ins = txs.filter(t => t.type === 'IN' && format(parseISO(t.timestamp.split('T')[0] + 'T00:00:00Z'), 'yyyy-\'W\'ww') === wStr).reduce((s, t) => s + t.weight, 0);
        const outs = txs.filter(t => t.type === 'OUT' && format(parseISO(t.timestamp.split('T')[0] + 'T00:00:00Z'), 'yyyy-\'W\'ww') === wStr).reduce((s, t) => s + t.weight, 0);
        return { label, in: ins / 1000, out: outs / 1000 };
      });
    }
    // monthly
    const months = eachMonthOfInterval({ start: subMonths(now, 11), end: now });
    return months.map(m => {
      const label = format(m, 'MMM yy');
      const mStr = format(m, 'yyyy-MM');
      const ins = txs.filter(t => t.type === 'IN' && t.timestamp.startsWith(mStr)).reduce((s, t) => s + t.weight, 0);
      const outs = txs.filter(t => t.type === 'OUT' && t.timestamp.startsWith(mStr)).reduce((s, t) => s + t.weight, 0);
      return { label, in: ins / 1000, out: outs / 1000 };
    });
  }, [data.transactions, period]);

  const occupancyPct = totalSlots ? Math.round((occupiedSlots / totalSlots) * 100) : 0;
  const avgMoisture = activeLots.length ? (activeLots.reduce((s, l) => s + l.moisture, 0) / activeLots.length).toFixed(1) : '—';
  const avgTemp = activeLots.length ? (activeLots.reduce((s, l) => s + l.temperature, 0) / activeLots.length).toFixed(1) : '—';

  const PIE_COLORS = ['#16a34a', '#2563eb', '#7c3aed', '#d97706', '#dc2626', '#0891b2', '#4f46e5'];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500">{data.config.name}</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1">
          {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${period === p ? 'bg-green-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* FIFO Alert */}
      {oldestDays > 90 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={20} />
          <div>
            <p className="text-red-800 font-semibold text-sm">FIFO Alert: Oldest Lot Exceeds 90 Days</p>
            <p className="text-red-700 text-sm mt-0.5">
              Lot <strong>{oldestLot?.lotNumber}</strong> ({oldestLot?.riceType}) has been stored for <strong>{oldestDays} days</strong> since {formatDate(oldestLot!.dateIn)}.
              Dispatch this lot first to maintain FIFO compliance.
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard icon={<Package size={20} className="text-green-600" />} bg="bg-green-50"
          label="Active Lots" value={activeLots.length.toString()} sub={`${occupiedSlots}/${totalSlots} slots (${occupancyPct}%)`} />
        <KpiCard icon={<Wheat size={20} className="text-blue-600" />} bg="bg-blue-50"
          label="Total Weight" value={`${numberWithCommas(totalWeight / 1000)} MT`} sub={`${numberWithCommas(totalBags)} bags`} />
        <KpiCard icon={<Thermometer size={20} className="text-orange-600" />} bg="bg-orange-50"
          label="Avg Temperature" value={`${avgTemp}°C`} sub="Active lots average" />
        <KpiCard icon={<Droplets size={20} className="text-sky-600" />} bg="bg-sky-50"
          label="Avg Moisture" value={`${avgMoisture}%`} sub="Target ≤ 14%" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movement Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Stock Movement (tonnes) — {period}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={movementData} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${Number(v).toFixed(2)} MT`]} />
              <Legend />
              <Bar dataKey="in" name="Stock In" fill="#16a34a" radius={[3, 3, 0, 0]} />
              <Bar dataKey="out" name="Stock Out" fill="#dc2626" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Age Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Age Distribution (FIFO)</h3>
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={ageDist} cx="50%" cy="50%" outerRadius={70} dataKey="value" label={({ name, value }) => value > 0 ? `${name}(${value})` : ''} labelLine={false} fontSize={10}>
                {ageDist.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1 mt-2">
            {[
              { label: '≤30d Fresh', color: '#16a34a' },
              { label: '31-60d Good', color: '#65a30d' },
              { label: '61-90d Warn', color: '#ca8a04' },
              { label: '91-120d Caution', color: '#ea580c' },
              { label: '>120d Critical', color: '#dc2626' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: l.color }} />
                {l.label}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Rice Type Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Stock by Rice Type (MT)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={riceTypeDist} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={v => (v / 1000).toFixed(1)} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip formatter={(v) => [`${(Number(v) / 1000).toFixed(2)} MT`]} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {riceTypeDist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* FIFO Queue */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Clock size={16} className="text-gray-500" />
            FIFO Dispatch Queue (oldest first)
          </h3>
          <div className="space-y-2 overflow-y-auto max-h-48">
            {activeLots
              .sort((a, b) => a.dateIn.localeCompare(b.dateIn))
              .slice(0, 8)
              .map((lot, i) => {
                const days = differenceInDays(new Date(), parseISO(lot.dateIn));
                const cat = getAgeCategory(lot.dateIn);
                return (
                  <div key={lot.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                    <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 text-xs flex items-center justify-center font-bold shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{lot.lotNumber}</p>
                      <p className="text-xs text-gray-500">{lot.riceType} · {lot.supplier}</p>
                    </div>
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full text-white shrink-0"
                      style={{ background: ageCategoryColor(cat) }}
                    >
                      {days}d
                    </span>
                  </div>
                );
              })}
            {activeLots.length === 0 && (
              <p className="text-gray-400 text-sm text-center py-6">No active lots</p>
            )}
          </div>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-gray-800">Slot Occupancy</h3>
          <span className="text-sm text-gray-500">{occupiedSlots} of {totalSlots} slots used ({occupancyPct}%)</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-4 overflow-hidden">
          <div
            className={`h-4 rounded-full transition-all ${occupancyPct >= 90 ? 'bg-red-500' : occupancyPct >= 70 ? 'bg-orange-500' : 'bg-green-600'}`}
            style={{ width: `${occupancyPct}%` }}
          />
        </div>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block" />Occupied ({occupiedSlots})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" />Empty ({totalSlots - occupiedSlots - data.slots.filter(s => s.status === 'maintenance').length})</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />Maintenance ({data.slots.filter(s => s.status === 'maintenance').length})</span>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icon, bg, label, value, sub }: { icon: React.ReactNode; bg: string; label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className={`p-2 rounded-lg ${bg}`}>{icon}</div>
        <span className="text-sm text-gray-500">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{sub}</p>
    </div>
  );
}
