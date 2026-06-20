import { useState } from 'react';
import type { FormEvent } from 'react';
import { Save, RotateCcw, AlertTriangle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { WarehouseConfig } from '../types';

export default function SettingsPage() {
  const { data, updateConfig, resetWarehouse } = useAppStore();
  const [form, setForm] = useState<WarehouseConfig>({ ...data.config });
  const [saved, setSaved] = useState(false);
  const [resetRows, setResetRows] = useState(data.config.rows);
  const [resetCols, setResetCols] = useState(data.config.cols);
  const [showReset, setShowReset] = useState(false);

  function set(key: keyof WarehouseConfig, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function handleReset() {
    if (window.confirm(`This will reconfigure the warehouse to ${resetRows}×${resetCols} slots. Existing slot data will be preserved where possible. Continue?`)) {
      resetWarehouse(resetRows, resetCols);
      setForm(f => ({ ...f, rows: resetRows, cols: resetCols }));
      setShowReset(false);
    }
  }

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3">Warehouse Information</h2>
        <Field label="Warehouse Name">
          <input className="input" value={form.name} onChange={e => set('name', e.target.value)} />
        </Field>
        <Field label="Address">
          <textarea className="input resize-none" rows={2} value={form.address} onChange={e => set('address', e.target.value)} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="SFA License No.">
            <input className="input" value={form.sfaLicenseNo} onChange={e => set('sfaLicenseNo', e.target.value)} />
          </Field>
          <Field label="UEN">
            <input className="input" value={form.uen} onChange={e => set('uen', e.target.value)} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Warehouse Rows">
            <input type="number" min="1" max="20" className="input" value={form.rows} onChange={e => set('rows', +e.target.value)} />
          </Field>
          <Field label="Warehouse Columns">
            <input type="number" min="1" max="20" className="input" value={form.cols} onChange={e => set('cols', +e.target.value)} />
          </Field>
        </div>
        <p className="text-sm text-gray-500">Total slots: <strong>{form.rows * form.cols}</strong> (max 200)</p>

        <div className="flex justify-end pt-2">
          <button type="submit" className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
            <Save size={15} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Danger zone */}
      <div className="bg-white rounded-xl border border-red-200 p-6">
        <h2 className="font-semibold text-red-700 mb-3 flex items-center gap-2">
          <AlertTriangle size={16} /> Reconfigure Warehouse Grid
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Change the grid dimensions. Slots outside the new dimensions will be hidden.
          All existing occupied slots within bounds will be preserved.
        </p>
        {!showReset ? (
          <button onClick={() => setShowReset(true)} className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50">
            Reconfigure Grid
          </button>
        ) : (
          <div className="flex items-end gap-4 flex-wrap">
            <div>
              <label className="label text-red-700">Rows</label>
              <input type="number" min="1" max="20" className="input w-20" value={resetRows} onChange={e => setResetRows(+e.target.value)} />
            </div>
            <div>
              <label className="label text-red-700">Columns</label>
              <input type="number" min="1" max="20" className="input w-20" value={resetCols} onChange={e => setResetCols(+e.target.value)} />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowReset(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm">Cancel</button>
              <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
                <RotateCcw size={14} /> Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
    </div>
  );
}
