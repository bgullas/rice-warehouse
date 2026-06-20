import { useState, useCallback } from 'react';
import type { AppData, ContainerLot, StorageSlot, Transaction, User, WarehouseConfig } from '../types';
import { generateId, generateSlots, hashPassword } from '../utils/helpers';

const STORAGE_KEY = 'sfa_rice_data';

const DEFAULT_USERS: User[] = [
  { id: 'u1', username: 'admin', name: 'Admin User', role: 'admin', email: 'admin@warehouse.sg', passwordHash: hashPassword('admin123') },
  { id: 'u2', username: 'operator', name: 'Warehouse Operator', role: 'operator', email: 'ops@warehouse.sg', passwordHash: hashPassword('op123') },
  { id: 'u3', username: 'viewer', name: 'Report Viewer', role: 'viewer', email: 'viewer@warehouse.sg', passwordHash: hashPassword('view123') },
];

const DEFAULT_CONFIG: WarehouseConfig = {
  rows: 10,
  cols: 10,
  name: 'SFA Rice Stockpile Warehouse',
  address: '10 Tuas South Ave 14, Singapore 637070',
  sfaLicenseNo: 'SFA-WH-2024-001',
  uen: '202400001K',
};

function seed(config: WarehouseConfig): AppData {
  const slots = generateSlots(config.rows, config.cols);
  // Pre-seed some demo lots
  const now = new Date();
  const demoLots: ContainerLot[] = [
    {
      id: 'lot1', lotNumber: 'LOT-240101-1001', slotId: 'R0C0', riceType: 'Jasmine White',
      grade: 'Grade A', supplier: 'Thai Rice Co. Ltd', supplierCountry: 'Thailand', origin: 'Surin, Thailand',
      quantity: 50, weightPerUnit: 50, totalWeight: 2500,
      dateIn: new Date(now.getTime() - 140 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(now.getTime() + 220 * 86400000).toISOString().split('T')[0],
      temperature: 25, moisture: 13.5, batchNumber: 'BT-2024-001', invoiceNumber: 'INV-TH-001',
      doNumber: 'DO-001', vehicleNumber: 'SBA1234A', receivedBy: 'operator',
      notes: 'Good quality batch', status: 'active',
    },
    {
      id: 'lot2', lotNumber: 'LOT-240215-2001', slotId: 'R0C1', riceType: 'Basmati',
      grade: 'Premium', supplier: 'India Agro Exports', supplierCountry: 'India', origin: 'Punjab, India',
      quantity: 40, weightPerUnit: 25, totalWeight: 1000,
      dateIn: new Date(now.getTime() - 95 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(now.getTime() + 270 * 86400000).toISOString().split('T')[0],
      temperature: 24, moisture: 12.8, batchNumber: 'BT-2024-002', invoiceNumber: 'INV-IN-002',
      doNumber: 'DO-002', vehicleNumber: 'GBP5678B', receivedBy: 'operator',
      notes: '', status: 'active',
    },
    {
      id: 'lot3', lotNumber: 'LOT-240310-3001', slotId: 'R0C2', riceType: 'Parboiled',
      grade: 'Grade B', supplier: 'Vietnam Rice Corp', supplierCountry: 'Vietnam', origin: 'Mekong Delta',
      quantity: 60, weightPerUnit: 50, totalWeight: 3000,
      dateIn: new Date(now.getTime() - 70 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(now.getTime() + 295 * 86400000).toISOString().split('T')[0],
      temperature: 26, moisture: 14.0, batchNumber: 'BT-2024-003', invoiceNumber: 'INV-VN-003',
      doNumber: 'DO-003', vehicleNumber: 'SDG3344C', receivedBy: 'operator',
      notes: 'Inspect moisture', status: 'active',
    },
    {
      id: 'lot4', lotNumber: 'LOT-240401-4001', slotId: 'R0C3', riceType: 'Brown Rice',
      grade: 'Grade A', supplier: 'Myanmar Grain Ltd', supplierCountry: 'Myanmar', origin: 'Ayeyarwady',
      quantity: 30, weightPerUnit: 25, totalWeight: 750,
      dateIn: new Date(now.getTime() - 45 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(now.getTime() + 315 * 86400000).toISOString().split('T')[0],
      temperature: 25, moisture: 13.2, batchNumber: 'BT-2024-004', invoiceNumber: 'INV-MM-004',
      doNumber: 'DO-004', vehicleNumber: 'SJH7890D', receivedBy: 'admin',
      notes: '', status: 'active',
    },
    {
      id: 'lot5', lotNumber: 'LOT-240505-5001', slotId: 'R0C4', riceType: 'Glutinous',
      grade: 'Grade A', supplier: 'Thai Rice Co. Ltd', supplierCountry: 'Thailand', origin: 'Chiang Rai',
      quantity: 20, weightPerUnit: 25, totalWeight: 500,
      dateIn: new Date(now.getTime() - 15 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(now.getTime() + 345 * 86400000).toISOString().split('T')[0],
      temperature: 24, moisture: 13.0, batchNumber: 'BT-2024-005', invoiceNumber: 'INV-TH-005',
      doNumber: 'DO-005', vehicleNumber: 'SBA1234A', receivedBy: 'operator',
      notes: 'Fresh batch', status: 'active',
    },
    {
      id: 'lot6', lotNumber: 'LOT-240520-6001', slotId: 'R1C0', riceType: 'Jasmine White',
      grade: 'Grade A', supplier: 'Thai Rice Co. Ltd', supplierCountry: 'Thailand', origin: 'Surin, Thailand',
      quantity: 45, weightPerUnit: 50, totalWeight: 2250,
      dateIn: new Date(now.getTime() - 5 * 86400000).toISOString().split('T')[0],
      expiryDate: new Date(now.getTime() + 355 * 86400000).toISOString().split('T')[0],
      temperature: 25, moisture: 13.1, batchNumber: 'BT-2024-006', invoiceNumber: 'INV-TH-006',
      doNumber: 'DO-006', vehicleNumber: 'GBP5678B', receivedBy: 'operator',
      notes: '', status: 'active',
    },
  ];

  // Mark occupied slots
  const lotSlotIds = new Set(demoLots.map(l => l.slotId));
  const updatedSlots = slots.map(s =>
    lotSlotIds.has(s.id)
      ? { ...s, status: 'occupied' as const, lotId: demoLots.find(l => l.slotId === s.id)?.id }
      : s
  );
  // Mark one slot as maintenance
  const mSlot = updatedSlots.find(s => s.status === 'empty' && s.id === 'R2C5');
  if (mSlot) mSlot.status = 'maintenance';

  // Seed some transactions
  const transactions: Transaction[] = demoLots.map(l => ({
    id: generateId(),
    type: 'IN',
    lotId: l.id,
    lotNumber: l.lotNumber,
    slotId: l.slotId,
    slotLabel: updatedSlots.find(s => s.id === l.slotId)?.label ?? '',
    quantity: l.quantity,
    weight: l.totalWeight,
    timestamp: l.dateIn + 'T08:00:00.000Z',
    userId: 'u2',
    userName: 'Warehouse Operator',
    notes: 'Initial stock in',
    riceType: l.riceType,
    supplier: l.supplier,
  }));

  return { config, slots: updatedSlots, lots: demoLots, transactions, users: DEFAULT_USERS };
}

function loadData(): AppData {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try { return JSON.parse(raw); } catch { /* fall through */ }
  }
  const initial = seed(DEFAULT_CONFIG);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveData(data: AppData) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function useAppStore() {
  const [data, setData] = useState<AppData>(() => loadData());

  const update = useCallback((updater: (d: AppData) => AppData) => {
    setData(prev => {
      const next = updater(prev);
      saveData(next);
      return next;
    });
  }, []);

  // Config
  const updateConfig = useCallback((config: WarehouseConfig) => {
    update(d => {
      const slots = generateSlots(config.rows, config.cols);
      // Preserve existing occupied/maintenance slots
      const merged = slots.map(s => {
        const existing = d.slots.find(e => e.id === s.id);
        return existing ? existing : s;
      });
      return { ...d, config, slots: merged };
    });
  }, [update]);

  const resetWarehouse = useCallback((rows: number, cols: number) => {
    update(d => {
      const slots = generateSlots(rows, cols);
      return { ...d, config: { ...d.config, rows, cols }, slots };
    });
  }, [update]);

  // Slots
  const addLot = useCallback((lot: Omit<ContainerLot, 'id'>, user: User): ContainerLot | null => {
    let created: ContainerLot | null = null;
    update(d => {
      const id = generateId();
      const newLot: ContainerLot = { ...lot, id };
      // Mark slot occupied
      const slots = d.slots.map(s =>
        s.id === lot.slotId ? { ...s, status: 'occupied' as const, lotId: id } : s
      );
      const slot = slots.find(s => s.id === lot.slotId);
      const tx: Transaction = {
        id: generateId(),
        type: 'IN',
        lotId: id,
        lotNumber: lot.lotNumber,
        slotId: lot.slotId,
        slotLabel: slot?.label ?? '',
        quantity: lot.quantity,
        weight: lot.totalWeight,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        notes: `Stock IN - ${lot.riceType} from ${lot.supplier}`,
        riceType: lot.riceType,
        supplier: lot.supplier,
      };
      created = newLot;
      return { ...d, slots, lots: [...d.lots, newLot], transactions: [...d.transactions, tx] };
    });
    return created;
  }, [update]);

  const updateLot = useCallback((lotId: string, updates: Partial<ContainerLot>) => {
    update(d => ({
      ...d,
      lots: d.lots.map(l => l.id === lotId ? { ...l, ...updates } : l),
    }));
  }, [update]);

  const dispatchLot = useCallback((lotId: string, details: { dispatchedTo: string; dispatchRef: string; notes: string }, user: User) => {
    update(d => {
      const lot = d.lots.find(l => l.id === lotId);
      if (!lot) return d;
      const lots = d.lots.map(l =>
        l.id === lotId
          ? { ...l, status: 'dispatched' as const, dateOut: new Date().toISOString().split('T')[0], ...details }
          : l
      );
      const slots = d.slots.map(s =>
        s.id === lot.slotId ? { ...s, status: 'empty' as const, lotId: undefined } : s
      );
      const slot = d.slots.find(s => s.id === lot.slotId);
      const tx: Transaction = {
        id: generateId(),
        type: 'OUT',
        lotId,
        lotNumber: lot.lotNumber,
        slotId: lot.slotId,
        slotLabel: slot?.label ?? '',
        quantity: lot.quantity,
        weight: lot.totalWeight,
        timestamp: new Date().toISOString(),
        userId: user.id,
        userName: user.name,
        notes: details.notes || `Stock OUT to ${details.dispatchedTo}`,
        riceType: lot.riceType,
        supplier: lot.supplier,
      };
      return { ...d, lots, slots, transactions: [...d.transactions, tx] };
    });
  }, [update]);

  const quarantineLot = useCallback((lotId: string, notes: string, user: User) => {
    update(d => {
      const lot = d.lots.find(l => l.id === lotId);
      if (!lot) return d;
      const lots = d.lots.map(l => l.id === lotId ? { ...l, status: 'quarantine' as const } : l);
      const slot = d.slots.find(s => s.id === lot.slotId);
      const tx: Transaction = {
        id: generateId(), type: 'QUARANTINE', lotId,
        lotNumber: lot.lotNumber, slotId: lot.slotId, slotLabel: slot?.label ?? '',
        quantity: lot.quantity, weight: lot.totalWeight,
        timestamp: new Date().toISOString(), userId: user.id, userName: user.name,
        notes, riceType: lot.riceType, supplier: lot.supplier,
      };
      return { ...d, lots, transactions: [...d.transactions, tx] };
    });
  }, [update]);

  const setSlotMaintenance = useCallback((slotId: string, maintenance: boolean) => {
    update(d => ({
      ...d,
      slots: d.slots.map(s =>
        s.id === slotId && s.status !== 'occupied'
          ? { ...s, status: maintenance ? 'maintenance' : 'empty' }
          : s
      ),
    }));
  }, [update]);

  const getFirstAvailableSlot = useCallback((): StorageSlot | null => {
    // FIFO: pick the slot with no specific order, just first empty
    return data.slots.find(s => s.status === 'empty') ?? null;
  }, [data.slots]);

  // User management
  const addUser = useCallback((u: Omit<User, 'id'>) => {
    update(d => ({ ...d, users: [...d.users, { ...u, id: generateId() }] }));
  }, [update]);

  const updateUser = useCallback((id: string, updates: Partial<User>) => {
    update(d => ({ ...d, users: d.users.map(u => u.id === id ? { ...u, ...updates } : u) }));
  }, [update]);

  const deleteUser = useCallback((id: string) => {
    update(d => ({ ...d, users: d.users.filter(u => u.id !== id) }));
  }, [update]);

  return {
    data,
    updateConfig,
    resetWarehouse,
    addLot,
    updateLot,
    dispatchLot,
    quarantineLot,
    setSlotMaintenance,
    getFirstAvailableSlot,
    addUser,
    updateUser,
    deleteUser,
  };
}
