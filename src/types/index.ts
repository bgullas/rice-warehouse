export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'operator' | 'viewer';
  email: string;
  passwordHash: string;
}

export interface WarehouseConfig {
  rows: number;
  cols: number;
  name: string;
  address: string;
  sfaLicenseNo: string;
  uen: string;
}

export type SlotStatus = 'empty' | 'occupied' | 'reserved' | 'maintenance';

export interface StorageSlot {
  id: string;
  row: number;
  col: number;
  label: string;
  status: SlotStatus;
  lotId?: string;
}

export type RiceType =
  | 'Basmati 1121'
  | 'Basmati 386'
  | 'Ponni Rice'
  | 'Golden Ponni'
  | 'Idly Ponni'
  | 'Broken Rice'
  | 'Sona Masuri'
  | 'PR-14'
  | 'Parboiled'
  | 'Brown Rice'
  | 'Glutinous'
  | 'Short Grain'
  | 'Long Grain'
  | 'Other';

export interface ContainerLot {
  id: string;
  lotNumber: string;
  slotId: string;
  riceType: RiceType;
  grade: string;
  supplier: string;
  supplierCountry: string;
  origin: string;
  quantity: number;
  weightPerUnit: number;
  totalWeight: number;
  dateIn: string;
  expiryDate: string;
  temperature: number;
  moisture: number;
  batchNumber: string;
  invoiceNumber: string;
  doNumber: string;
  vehicleNumber: string;
  receivedBy: string;
  notes: string;
  status: 'active' | 'dispatched' | 'quarantine';
  dateOut?: string;
  dispatchedTo?: string;
  dispatchRef?: string;
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT' | 'TRANSFER' | 'QUARANTINE' | 'ADJUSTMENT';
  lotId: string;
  lotNumber: string;
  slotId: string;
  slotLabel: string;
  quantity: number;
  weight: number;
  timestamp: string;
  userId: string;
  userName: string;
  notes: string;
  riceType: string;
  supplier: string;
}

export interface AppData {
  config: WarehouseConfig;
  slots: StorageSlot[];
  lots: ContainerLot[];
  transactions: Transaction[];
  users: User[];
}
