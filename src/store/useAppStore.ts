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
  rows: 25,
  cols: 2,
  name: 'SFA Rice Stockpile Warehouse',
  address: '10 Tuas South Ave 14, Singapore 637070',
  sfaLicenseNo: 'SFA-WH-2024-001',
  uen: '202400001K',
};

function seed(config: WarehouseConfig): AppData {
  const slots = generateSlots(config.rows, config.cols);
  const now = new Date();
  const d = (days: number) => new Date(now.getTime() - days * 86400000).toISOString().split('T')[0];
  const exp = (days: number) => new Date(now.getTime() + days * 86400000).toISOString().split('T')[0];

  const demoLots: ContainerLot[] = [
    {
      id: 'lot1', lotNumber: 'LOT-240101-1001', slotId: 'R0C0', riceType: 'Basmati 1121',
      grade: 'Premium', supplier: 'India Agro Exports', supplierCountry: 'India', origin: 'Punjab, India',
      quantity: 50, weightPerUnit: 50, totalWeight: 2500,
      dateIn: d(145), expiryDate: exp(220), temperature: 25, moisture: 12.5,
      batchNumber: 'BT-2024-001', invoiceNumber: 'INV-IN-001', doNumber: 'DO-001',
      vehicleNumber: 'SBA1234A', receivedBy: 'operator', notes: 'Premium grade, long grain', status: 'active',
    },
    {
      id: 'lot2', lotNumber: 'LOT-240120-2001', slotId: 'R0C1', riceType: 'Ponni Rice',
      grade: 'Grade A', supplier: 'Tamil Nadu Grains Co.', supplierCountry: 'India', origin: 'Tamil Nadu, India',
      quantity: 40, weightPerUnit: 50, totalWeight: 2000,
      dateIn: d(110), expiryDate: exp(255), temperature: 26, moisture: 13.2,
      batchNumber: 'BT-2024-002', invoiceNumber: 'INV-IN-002', doNumber: 'DO-002',
      vehicleNumber: 'GBP5678B', receivedBy: 'operator', notes: '', status: 'active',
    },
    {
      id: 'lot3', lotNumber: 'LOT-240210-3001', slotId: 'R1C0', riceType: 'Golden Ponni',
      grade: 'Grade A', supplier: 'Tamil Nadu Grains Co.', supplierCountry: 'India', origin: 'Thanjavur, Tamil Nadu',
      quantity: 60, weightPerUnit: 25, totalWeight: 1500,
      dateIn: d(88), expiryDate: exp(277), temperature: 25, moisture: 13.0,
      batchNumber: 'BT-2024-003', invoiceNumber: 'INV-IN-003', doNumber: 'DO-003',
      vehicleNumber: 'SDG3344C', receivedBy: 'operator', notes: 'Premium golden variety', status: 'active',
    },
    {
      id: 'lot4', lotNumber: 'LOT-240301-4001', slotId: 'R1C1', riceType: 'Idly Ponni',
      grade: 'Grade A', supplier: 'Coimbatore Rice Mills', supplierCountry: 'India', origin: 'Coimbatore, Tamil Nadu',
      quantity: 80, weightPerUnit: 25, totalWeight: 2000,
      dateIn: d(72), expiryDate: exp(293), temperature: 24, moisture: 13.5,
      batchNumber: 'BT-2024-004', invoiceNumber: 'INV-IN-004', doNumber: 'DO-004',
      vehicleNumber: 'SJH7890D', receivedBy: 'admin', notes: 'Ideal for idly/dosa', status: 'active',
    },
    {
      id: 'lot5', lotNumber: 'LOT-240315-5001', slotId: 'R2C0', riceType: 'Broken Rice',
      grade: 'Grade B', supplier: 'Kerala Rice Traders', supplierCountry: 'India', origin: 'Kerala, India',
      quantity: 100, weightPerUnit: 50, totalWeight: 5000,
      dateIn: d(55), expiryDate: exp(310), temperature: 26, moisture: 14.0,
      batchNumber: 'BT-2024-005', invoiceNumber: 'INV-IN-005', doNumber: 'DO-005',
      vehicleNumber: 'SBA1234A', receivedBy: 'operator', notes: 'Check moisture — borderline', status: 'active',
    },
    {
      id: 'lot6', lotNumber: 'LOT-240401-6001', slotId: 'R2C1', riceType: 'Sona Masuri',
      grade: 'Grade A', supplier: 'Andhra Rice Corp', supplierCountry: 'India', origin: 'Andhra Pradesh, India',
      quantity: 45, weightPerUnit: 25, totalWeight: 1125,
      dateIn: d(42), expiryDate: exp(323), temperature: 25, moisture: 12.8,
      batchNumber: 'BT-2024-006', invoiceNumber: 'INV-IN-006', doNumber: 'DO-006',
      vehicleNumber: 'GBP5678B', receivedBy: 'operator', notes: '', status: 'active',
    },
    {
      id: 'lot7', lotNumber: 'LOT-240420-7001', slotId: 'R3C0', riceType: 'PR-14',
      grade: 'Grade B', supplier: 'Punjab Rice Exporters', supplierCountry: 'India', origin: 'Punjab, India',
      quantity: 70, weightPerUnit: 50, totalWeight: 3500,
      dateIn: d(28), expiryDate: exp(337), temperature: 24, moisture: 13.1,
      batchNumber: 'BT-2024-007', invoiceNumber: 'INV-IN-007', doNumber: 'DO-007',
      vehicleNumber: 'SDG3344C', receivedBy: 'operator', notes: '', status: 'active',
    },
    {
      id: 'lot8', lotNumber: 'LOT-240501-8001', slotId: 'R3C1', riceType: 'Basmati 386',
      grade: 'Premium', supplier: 'India Agro Exports', supplierCountry: 'India', origin: 'Haryana, India',
      quantity: 30, weightPerUnit: 50, totalWeight: 1500,
      dateIn: d(18), expiryDate: exp(347), temperature: 25, moisture: 12.3,
      batchNumber: 'BT-2024-008', invoiceNumber: 'INV-IN-008', doNumber: 'DO-008',
      vehicleNumber: 'SJH7890D', receivedBy: 'operator', notes: 'Aged Basmati', status: 'active',
    },
    {
      id: 'lot9', lotNumber: 'LOT-240510-9001', slotId: 'R4C0', riceType: 'Parboiled',
      grade: 'Grade A', supplier: 'Sri Lanka Grain Co.', supplierCountry: 'Sri Lanka', origin: 'Central Province, SL',
      quantity: 90, weightPerUnit: 25, totalWeight: 2250,
      dateIn: d(9), expiryDate: exp(356), temperature: 26, moisture: 13.7,
      batchNumber: 'BT-2024-009', invoiceNumber: 'INV-SL-009', doNumber: 'DO-009',
      vehicleNumber: 'SBA1234A', receivedBy: 'admin', notes: '', status: 'active',
    },
    {
      id: 'lot10', lotNumber: 'LOT-240518-1001', slotId: 'R4C1', riceType: 'Brown Rice',
      grade: 'Grade A', supplier: 'Organic Farms Pte Ltd', supplierCountry: 'Singapore', origin: 'Imported via SG',
      quantity: 25, weightPerUnit: 25, totalWeight: 625,
      dateIn: d(3), expiryDate: exp(362), temperature: 24, moisture: 12.6,
      batchNumber: 'BT-2024-010', invoiceNumber: 'INV-SG-010', doNumber: 'DO-010',
      vehicleNumber: 'GBP5678B', receivedBy: 'operator', notes: 'Organic certified', status: 'active',
    },
    {
      id: 'lot11', lotNumber: 'LOT-240101-1101', slotId: 'R5C0', riceType: 'Golden Ponni',
      grade: 'Grade A', supplier: 'Tamil Nadu Grains Co.', supplierCountry: 'India', origin: 'Thanjavur, Tamil Nadu',
      quantity: 55, weightPerUnit: 50, totalWeight: 2750,
      dateIn: d(130), expiryDate: exp(235), temperature: 25, moisture: 13.3,
      batchNumber: 'BT-2024-011', invoiceNumber: 'INV-IN-011', doNumber: 'DO-011',
      vehicleNumber: 'SDG3344C', receivedBy: 'operator', notes: '', status: 'active',
    },
    {
      id: 'lot12', lotNumber: 'LOT-240201-1201', slotId: 'R5C1', riceType: 'Idly Ponni',
      grade: 'Grade A', supplier: 'Coimbatore Rice Mills', supplierCountry: 'India', origin: 'Coimbatore, Tamil Nadu',
      quantity: 65, weightPerUnit: 25, totalWeight: 1625,
      dateIn: d(96), expiryDate: exp(269), temperature: 25, moisture: 13.0,
      batchNumber: 'BT-2024-012', invoiceNumber: 'INV-IN-012', doNumber: 'DO-012',
      vehicleNumber: 'SJH7890D', receivedBy: 'operator', notes: '', status: 'active',
    },
  ];

  // Mark occupied slots
  const lotSlotIds = new Map(demoLots.map(l => [l.slotId, l.id]));
  const updatedSlots = slots.map(s =>
    lotSlotIds.has(s.id)
      ? { ...s, status: 'occupied' as const, lotId: lotSlotIds.get(s.id) }
      : s
  );
  // Mark one slot as maintenance
  const mSlot = updatedSlots.find(s => s.status === 'empty' && s.id === 'R6C1');
  if (mSlot) mSlot.status = 'maintenance';

  const transactions: Transaction[] = demoLots.map(l => ({
    id: generateId(), type: 'IN' as const,
    lotId: l.id, lotNumber: l.lotNumber,
    slotId: l.slotId, slotLabel: updatedSlots.find(s => s.id === l.slotId)?.label ?? '',
    quantity: l.quantity, weight: l.totalWeight,
    timestamp: l.dateIn + 'T08:00:00.000Z',
    userId: 'u2', userName: 'Warehouse Operator',
    notes: 'Initial stock in', riceType: l.riceType, supplier: l.supplier,
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

// Merge new slot grid with existing slot data — always preserve occupied/maintenance slots
function mergeSlots(newSlots: StorageSlot[], existing: StorageSlot[]): StorageSlot[] {
  return newSlots.map(s => {
    const prev = existing.find(e => e.id === s.id);
    return prev ? prev : s;
  });
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

  // Always preserve existing slot data when resizing — never wipe lots
  const updateConfig = useCallback((config: WarehouseConfig) => {
    update(d => {
      const newSlots = generateSlots(config.rows, config.cols);
      return { ...d, config, slots: mergeSlots(newSlots, d.slots) };
    });
  }, [update]);

  const addLot = useCallback((lot: Omit<ContainerLot, 'id'>, user: User): ContainerLot | null => {
    let created: ContainerLot | null = null;
    update(d => {
      const id = generateId();
      const newLot: ContainerLot = { ...lot, id };
      const slots = d.slots.map(s =>
        s.id === lot.slotId ? { ...s, status: 'occupied' as const, lotId: id } : s
      );
      const slot = slots.find(s => s.id === lot.slotId);
      const tx: Transaction = {
        id: generateId(), type: 'IN',
        lotId: id, lotNumber: lot.lotNumber,
        slotId: lot.slotId, slotLabel: slot?.label ?? '',
        quantity: lot.quantity, weight: lot.totalWeight,
        timestamp: new Date().toISOString(),
        userId: user.id, userName: user.name,
        notes: `Stock IN - ${lot.riceType} from ${lot.supplier}`,
        riceType: lot.riceType, supplier: lot.supplier,
      };
      created = newLot;
      return { ...d, slots, lots: [...d.lots, newLot], transactions: [...d.transactions, tx] };
    });
    return created;
  }, [update]);

  const updateLot = useCallback((lotId: string, updates: Partial<ContainerLot>) => {
    update(d => ({ ...d, lots: d.lots.map(l => l.id === lotId ? { ...l, ...updates } : l) }));
  }, [update]);

  const dispatchLot = useCallback((lotId: string, details: { dispatchedTo: string; dispatchRef: string; notes: string }, user: User) => {
    update(d => {
      const lot = d.lots.find(l => l.id === lotId);
      if (!lot) return d;
      const lots = d.lots.map(l =>
        l.id === lotId ? { ...l, status: 'dispatched' as const, dateOut: new Date().toISOString().split('T')[0], ...details } : l
      );
      const slots = d.slots.map(s =>
        s.id === lot.slotId ? { ...s, status: 'empty' as const, lotId: undefined } : s
      );
      const slot = d.slots.find(s => s.id === lot.slotId);
      const tx: Transaction = {
        id: generateId(), type: 'OUT', lotId,
        lotNumber: lot.lotNumber, slotId: lot.slotId, slotLabel: slot?.label ?? '',
        quantity: lot.quantity, weight: lot.totalWeight,
        timestamp: new Date().toISOString(), userId: user.id, userName: user.name,
        notes: details.notes || `Stock OUT to ${details.dispatchedTo}`,
        riceType: lot.riceType, supplier: lot.supplier,
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
    return data.slots.find(s => s.status === 'empty') ?? null;
  }, [data.slots]);

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
