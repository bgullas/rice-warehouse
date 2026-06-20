import { useState, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Download, FileText, BarChart2, TrendingUp, Package } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { formatDate, numberWithCommas } from '../utils/helpers';
import type { ContainerLot, Transaction } from '../types';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

type ReportType = 'inventory' | 'movement' | 'fifo' | 'transactions';

export default function ReportsPage() {
  const { data } = useAppStore();
  const [reportType, setReportType] = useState<ReportType>('inventory');
  const [monthOffset, setMonthOffset] = useState(0);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [useCustom, setUseCustom] = useState(false);

  const refMonth = subMonths(new Date(), monthOffset);
  const monthStart = startOfMonth(refMonth);
  const monthEnd = endOfMonth(refMonth);
  const monthLabel = format(refMonth, 'MMMM yyyy');

  const dateRange = useCustom
    ? { start: fromDate ? new Date(fromDate) : monthStart, end: toDate ? new Date(toDate) : monthEnd }
    : { start: monthStart, end: monthEnd };

  const activeLots = data.lots.filter(l => l.status === 'active');

  const periodTransactions = useMemo(() =>
    data.transactions.filter(t => {
      try {
        const d = parseISO(t.timestamp);
        return isWithinInterval(d, dateRange);
      } catch { return false; }
    }), [data.transactions, dateRange]);

  const insInPeriod = periodTransactions.filter(t => t.type === 'IN');
  const outsInPeriod = periodTransactions.filter(t => t.type === 'OUT');
  const totalIn = insInPeriod.reduce((s, t) => s + t.weight, 0);
  const totalOut = outsInPeriod.reduce((s, t) => s + t.weight, 0);
  const totalActiveWeight = activeLots.reduce((s, l) => s + l.totalWeight, 0);

  function generatePDF() {
    const doc = new jsPDF();
    const title = getReportTitle();
    const periodStr = useCustom ? `${fromDate} to ${toDate}` : monthLabel;

    // Header
    doc.setFontSize(18);
    doc.setTextColor(22, 163, 74);
    doc.text('SFA Rice Stockpile Management', 14, 20);
    doc.setFontSize(13);
    doc.setTextColor(30, 30, 30);
    doc.text(title, 14, 30);
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Period: ${periodStr}`, 14, 38);
    doc.text(`Generated: ${format(new Date(), 'dd MMM yyyy HH:mm')}`, 14, 44);
    doc.text(`License: ${data.config.sfaLicenseNo}`, 14, 50);

    if (reportType === 'inventory') {
      autoTable(doc, {
        startY: 58,
        head: [['Lot Number', 'Rice Type', 'Grade', 'Supplier', 'Slot', 'Date In', 'Qty (bags)', 'Weight (kg)', 'Moisture%', 'Temp°C']],
        body: activeLots.map(l => [
          l.lotNumber, l.riceType, l.grade, l.supplier,
          data.slots.find(s => s.id === l.slotId)?.label ?? '—',
          formatDate(l.dateIn), l.quantity, numberWithCommas(l.totalWeight), l.moisture, l.temperature,
        ]),
        foot: [['TOTAL', '', '', '', '', '', activeLots.reduce((s, l) => s + l.quantity, 0), numberWithCommas(totalActiveWeight), '', '']],
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
        footStyles: { fillColor: [240, 240, 240], fontStyle: 'bold' },
      });
    } else if (reportType === 'movement') {
      autoTable(doc, {
        startY: 58,
        head: [['Date/Time', 'Type', 'Lot Number', 'Rice Type', 'Supplier', 'Slot', 'Qty (bags)', 'Weight (kg)', 'By']],
        body: periodTransactions.map(t => [
          format(parseISO(t.timestamp), 'dd/MM/yyyy HH:mm'), t.type, t.lotNumber, t.riceType,
          t.supplier, t.slotLabel, t.quantity, numberWithCommas(t.weight), t.userName,
        ]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
      });
    } else if (reportType === 'fifo') {
      const sorted = [...activeLots].sort((a, b) => a.dateIn.localeCompare(b.dateIn));
      autoTable(doc, {
        startY: 58,
        head: [['FIFO#', 'Lot Number', 'Rice Type', 'Supplier', 'Slot', 'Date In', 'Days Stored', 'Weight (kg)', 'Status']],
        body: sorted.map((l, i) => {
          const days = Math.floor((Date.now() - new Date(l.dateIn).getTime()) / 86400000);
          const status = days > 120 ? 'CRITICAL' : days > 90 ? 'CAUTION' : days > 60 ? 'WARNING' : days > 30 ? 'GOOD' : 'FRESH';
          return [
            i + 1, l.lotNumber, l.riceType, l.supplier,
            data.slots.find(s => s.id === l.slotId)?.label ?? '—',
            formatDate(l.dateIn), days, numberWithCommas(l.totalWeight), status,
          ];
        }),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [22, 163, 74] },
        didParseCell: (hookData) => {
          if (hookData.section === 'body' && hookData.column.index === 8) {
            const v = hookData.cell.raw as string;
            if (v === 'CRITICAL') hookData.cell.styles.textColor = [220, 38, 38];
            else if (v === 'CAUTION') hookData.cell.styles.textColor = [234, 88, 12];
            else if (v === 'WARNING') hookData.cell.styles.textColor = [202, 138, 4];
          }
        },
      });
    } else {
      autoTable(doc, {
        startY: 58,
        head: [['Date/Time', 'Type', 'Lot', 'Rice Type', 'Supplier', 'Slot', 'Weight (kg)', 'User', 'Notes']],
        body: data.transactions.map(t => [
          format(parseISO(t.timestamp), 'dd/MM/yyyy HH:mm'), t.type, t.lotNumber, t.riceType,
          t.supplier, t.slotLabel, numberWithCommas(t.weight), t.userName, t.notes,
        ]),
        styles: { fontSize: 7 },
        headStyles: { fillColor: [22, 163, 74] },
      });
    }

    doc.save(`SFA_${reportType}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  }

  function generateExcel() {
    let rows: Record<string, unknown>[] = [];
    const title = getReportTitle();

    if (reportType === 'inventory') {
      rows = activeLots.map(l => ({
        'Lot Number': l.lotNumber, 'Rice Type': l.riceType, 'Grade': l.grade,
        'Supplier': l.supplier, 'Country': l.supplierCountry, 'Origin': l.origin,
        'Slot': data.slots.find(s => s.id === l.slotId)?.label ?? '',
        'Date In': formatDate(l.dateIn), 'Expiry Date': formatDate(l.expiryDate),
        'Qty (bags)': l.quantity, 'Weight/bag (kg)': l.weightPerUnit, 'Total Weight (kg)': l.totalWeight,
        'Moisture (%)': l.moisture, 'Temp (°C)': l.temperature,
        'Invoice': l.invoiceNumber, 'DO': l.doNumber, 'Batch': l.batchNumber,
        'Vehicle': l.vehicleNumber, 'Received By': l.receivedBy, 'Notes': l.notes,
      }));
    } else if (reportType === 'movement' || reportType === 'transactions') {
      const txs = reportType === 'movement' ? periodTransactions : data.transactions;
      rows = txs.map(t => ({
        'Timestamp': format(parseISO(t.timestamp), 'dd/MM/yyyy HH:mm'),
        'Type': t.type, 'Lot Number': t.lotNumber, 'Rice Type': t.riceType,
        'Supplier': t.supplier, 'Slot': t.slotLabel, 'Qty (bags)': t.quantity,
        'Weight (kg)': t.weight, 'User': t.userName, 'Notes': t.notes,
      }));
    } else { // fifo
      rows = [...activeLots].sort((a, b) => a.dateIn.localeCompare(b.dateIn)).map((l, i) => {
        const days = Math.floor((Date.now() - new Date(l.dateIn).getTime()) / 86400000);
        return {
          'FIFO Rank': i + 1, 'Lot Number': l.lotNumber, 'Rice Type': l.riceType,
          'Grade': l.grade, 'Supplier': l.supplier,
          'Slot': data.slots.find(s => s.id === l.slotId)?.label ?? '',
          'Date In': formatDate(l.dateIn), 'Days Stored': days, 'Total Weight (kg)': l.totalWeight,
          'Age Status': days > 120 ? 'CRITICAL' : days > 90 ? 'CAUTION' : days > 60 ? 'WARNING' : days > 30 ? 'GOOD' : 'FRESH',
        };
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31));
    XLSX.writeFile(wb, `SFA_${reportType}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  }

  function getReportTitle(): string {
    const map: Record<ReportType, string> = {
      inventory: 'Current Inventory Report',
      movement: 'Stock Movement Report',
      fifo: 'FIFO Compliance Report',
      transactions: 'Transaction Audit Report',
    };
    return map[reportType];
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500">Generate and download SFA-compliant stock reports</p>
      </div>

      {/* Report type selector */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { type: 'inventory' as ReportType, icon: Package, label: 'Inventory', desc: 'Current active stock' },
          { type: 'movement' as ReportType, icon: TrendingUp, label: 'Movement', desc: 'IN/OUT by period' },
          { type: 'fifo' as ReportType, icon: BarChart2, label: 'FIFO Compliance', desc: 'Age analysis & queue' },
          { type: 'transactions' as ReportType, icon: FileText, label: 'All Transactions', desc: 'Full audit trail' },
        ].map(r => (
          <button
            key={r.type}
            onClick={() => setReportType(r.type)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${reportType === r.type ? 'border-green-600 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
          >
            <r.icon size={20} className={reportType === r.type ? 'text-green-700' : 'text-gray-500'} />
            <p className={`font-semibold mt-2 text-sm ${reportType === r.type ? 'text-green-800' : 'text-gray-800'}`}>{r.label}</p>
            <p className="text-xs text-gray-500 mt-0.5">{r.desc}</p>
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Report Period</h3>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
              <input type="radio" checked={!useCustom} onChange={() => setUseCustom(false)} />
              Monthly preset
            </label>
            {!useCustom && (
              <div className="flex items-center gap-3">
                <button onClick={() => setMonthOffset(o => o + 1)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">←</button>
                <span className="text-sm font-medium w-36 text-center">{monthLabel}</span>
                <button onClick={() => setMonthOffset(o => Math.max(0, o - 1))} disabled={monthOffset === 0} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">→</button>
              </div>
            )}
          </div>
          <div>
            <label className="flex items-center gap-2 text-sm mb-3 cursor-pointer">
              <input type="radio" checked={useCustom} onChange={() => setUseCustom(true)} />
              Custom date range
            </label>
            {useCustom && (
              <div className="flex items-center gap-3">
                <input type="date" className="input w-36 text-sm" value={fromDate} onChange={e => setFromDate(e.target.value)} />
                <span className="text-gray-400 text-sm">to</span>
                <input type="date" className="input w-36 text-sm" value={toDate} onChange={e => setToDate(e.target.value)} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SumCard label="Active Lots" value={activeLots.length.toString()} sub={`${data.slots.filter(s => s.status === 'occupied').length}/${data.slots.length} slots`} color="green" />
        <SumCard label="Active Weight" value={`${(totalActiveWeight / 1000).toFixed(2)} MT`} sub={`${activeLots.reduce((s, l) => s + l.quantity, 0)} bags`} color="blue" />
        <SumCard label={`IN (${useCustom ? 'custom' : monthLabel})`} value={`${(totalIn / 1000).toFixed(2)} MT`} sub={`${insInPeriod.length} lots`} color="green" />
        <SumCard label={`OUT (${useCustom ? 'custom' : monthLabel})`} value={`${(totalOut / 1000).toFixed(2)} MT`} sub={`${outsInPeriod.length} lots`} color="red" />
      </div>

      {/* Preview table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">{getReportTitle()} Preview</h3>
          <div className="flex gap-2">
            <button onClick={generatePDF} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg font-medium">
              <Download size={15} /> PDF
            </button>
            <button onClick={generateExcel} className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-sm rounded-lg font-medium">
              <Download size={15} /> Excel
            </button>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          {reportType === 'inventory' && <InventoryPreview lots={activeLots} slots={Object.fromEntries(data.slots.map(s => [s.id, s.label]))} />}
          {reportType === 'movement' && <MovementPreview txs={periodTransactions} />}
          {reportType === 'fifo' && <FifoPreview lots={activeLots} slots={Object.fromEntries(data.slots.map(s => [s.id, s.label]))} />}
          {reportType === 'transactions' && <MovementPreview txs={data.transactions} />}
        </div>
      </div>
    </div>
  );
}

function SumCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  const c = { green: 'text-green-700', blue: 'text-blue-700', red: 'text-red-700' }[color] ?? 'text-gray-700';
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-bold mt-1 ${c}`}>{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}

function InventoryPreview({ lots, slots }: { lots: ContainerLot[]; slots: Record<string, string> }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          {['Lot Number','Rice Type','Grade','Supplier','Slot','Date In','Qty','Weight (kg)','Moist%','Temp°C'].map(h => (
            <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {lots.sort((a,b)=>a.dateIn.localeCompare(b.dateIn)).map(l => (
          <tr key={l.id} className="hover:bg-gray-50">
            <td className="px-3 py-2 font-medium">{l.lotNumber}</td>
            <td className="px-3 py-2">{l.riceType}</td>
            <td className="px-3 py-2">{l.grade}</td>
            <td className="px-3 py-2">{l.supplier}</td>
            <td className="px-3 py-2">{slots[l.slotId] ?? '—'}</td>
            <td className="px-3 py-2">{formatDate(l.dateIn)}</td>
            <td className="px-3 py-2">{l.quantity}</td>
            <td className="px-3 py-2">{numberWithCommas(l.totalWeight)}</td>
            <td className="px-3 py-2">{l.moisture}</td>
            <td className="px-3 py-2">{l.temperature}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MovementPreview({ txs }: { txs: Transaction[] }) {
  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          {['Timestamp','Type','Lot Number','Rice Type','Supplier','Slot','Weight (kg)','User','Notes'].map(h => (
            <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {[...txs].reverse().map(t => (
          <tr key={t.id} className="hover:bg-gray-50">
            <td className="px-3 py-2 whitespace-nowrap">{format(parseISO(t.timestamp), 'dd/MM/yy HH:mm')}</td>
            <td className="px-3 py-2">
              <span className={`px-1.5 py-0.5 rounded font-semibold ${t.type==='IN'?'bg-green-100 text-green-700':t.type==='OUT'?'bg-blue-100 text-blue-700':'bg-orange-100 text-orange-700'}`}>{t.type}</span>
            </td>
            <td className="px-3 py-2">{t.lotNumber}</td>
            <td className="px-3 py-2">{t.riceType}</td>
            <td className="px-3 py-2">{t.supplier}</td>
            <td className="px-3 py-2">{t.slotLabel}</td>
            <td className="px-3 py-2">{numberWithCommas(t.weight)}</td>
            <td className="px-3 py-2">{t.userName}</td>
            <td className="px-3 py-2 max-w-xs truncate">{t.notes}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FifoPreview({ lots, slots }: { lots: ContainerLot[]; slots: Record<string, string> }) {
  const sorted = [...lots].sort((a,b)=>a.dateIn.localeCompare(b.dateIn));
  return (
    <table className="w-full text-xs">
      <thead className="bg-gray-50 sticky top-0">
        <tr>
          {['#','Lot Number','Rice Type','Supplier','Slot','Date In','Days','Weight (kg)','Status'].map(h=>(
            <th key={h} className="text-left px-3 py-2 text-gray-500 font-semibold">{h}</th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-gray-50">
        {sorted.map((l,i)=>{
          const days=Math.floor((Date.now()-new Date(l.dateIn).getTime())/86400000);
          const status=days>120?'CRITICAL':days>90?'CAUTION':days>60?'WARNING':days>30?'GOOD':'FRESH';
          const sc={CRITICAL:'text-red-700',CAUTION:'text-orange-600',WARNING:'text-yellow-700',GOOD:'text-lime-700',FRESH:'text-green-700'}[status];
          return (
            <tr key={l.id} className="hover:bg-gray-50">
              <td className="px-3 py-2 font-bold text-gray-400">{i+1}</td>
              <td className="px-3 py-2 font-medium">{l.lotNumber}</td>
              <td className="px-3 py-2">{l.riceType}</td>
              <td className="px-3 py-2">{l.supplier}</td>
              <td className="px-3 py-2">{slots[l.slotId]??'—'}</td>
              <td className="px-3 py-2">{formatDate(l.dateIn)}</td>
              <td className="px-3 py-2 font-semibold">{days}</td>
              <td className="px-3 py-2">{numberWithCommas(l.totalWeight)}</td>
              <td className={`px-3 py-2 font-bold ${sc}`}>{status}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
