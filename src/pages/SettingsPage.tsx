import { useState } from 'react';
import type { FormEvent } from 'react';
import { Save, Grid } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import type { WarehouseConfig } from '../types';

export default function SettingsPage() {
  const { data, updateConfig } = useAppStore();
  const [form, setForm] = useState<WarehouseConfig>({ ...data.config });
  const [saved, setSaved] = useState(false);

  function set(key: keyof WarehouseConfig, value: string | number) {
    setForm(f => ({ ...f, [key]: value }));
  }

  function handleSave(e: FormEvent) {
    e.preventDefault();
    updateConfig(form);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const totalSlots = form.rows * form.cols;
  const occupiedCount = data.slots.filter(s => s.status === 'occupied').length;

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

        <h2 className="font-semibold text-gray-800 border-b border-gray-100 pb-3 pt-2 flex items-center gap-2">
          <Grid size={16} className="text-gray-500" /> Grid Configuration
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Rows (max 25, A–Y)">
            <input type="number" min="1" max="25" className="input" value={form.rows}
              onChange={e => set('rows', Math.min(25, Math.max(1, +e.target.value)))} />
          </Field>
          <Field label="Columns (max 10)">
            <input type="number" min="1" max="10" className="input" value={form.cols}
              onChange={e => set('cols', Math.min(10, Math.max(1, +e.target.value)))} />
          </Field>
        </div>

        <div className={`rounded-lg p-3 text-sm ${totalSlots > 200 ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-800'}`}>
          <span className="font-semibold">{form.rows} × {form.cols} = {totalSlots} slots</span>
          {totalSlots > 200 && <span className="ml-2">⚠ Exceeds SFA 200-slot limit</span>}
          {totalSlots <= 200 && <span className="ml-2 text-green-600">✓ Within SFA limit (max 200)</span>}
        </div>
        <p className="text-xs text-gray-500 flex items-center gap-1">
          ℹ Existing slot data is always preserved when the grid is resized. Lots in slots outside the new bounds remain in the system but will not appear on the grid until the grid is expanded again.
        </p>
        {occupiedCount > 0 && (
          <p className="text-xs text-amber-600">
            {occupiedCount} occupied slot{occupiedCount > 1 ? 's' : ''} currently active — their data will not be lost.
          </p>
        )}

        <div className="flex justify-end pt-2">
          <button type="submit" disabled={totalSlots > 200}
            className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-lg text-sm font-medium disabled:opacity-50">
            <Save size={15} />
            {saved ? 'Saved!' : 'Save Settings'}
          </button>
        </div>
      </form>
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
