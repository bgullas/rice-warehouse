import { useState } from 'react';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';
import { hashPassword } from '../utils/helpers';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';

export default function UsersPage() {
  const { data, addUser, updateUser, deleteUser } = useAppStore();
  const { currentUser } = useAuth();
  const [modal, setModal] = useState<'add' | User | null>(null);

  const roleBadge: Record<string, 'purple' | 'blue' | 'gray'> = { admin: 'purple', operator: 'blue', viewer: 'gray' };

  return (
    <div className="p-6 max-w-3xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <button onClick={() => setModal('add')} className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-4 py-2.5 rounded-lg text-sm font-medium">
          <UserPlus size={16} /> Add User
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {data.users.map(u => {
          return (
            <div key={u.id} className="flex items-center gap-4 px-5 py-4">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white font-bold shrink-0">
                {u.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900">{u.name}</p>
                  {u.id === currentUser?.id && <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">You</span>}
                </div>
                <p className="text-sm text-gray-500">@{u.username} · {u.email}</p>
              </div>
              <Badge label={u.role} color={roleBadge[u.role]} />
              <div className="flex gap-1">
                <button onClick={() => setModal(u)} className="p-1.5 rounded hover:bg-gray-100 text-blue-500"><Edit2 size={15} /></button>
                {u.id !== currentUser?.id && (
                  <button onClick={() => { if (window.confirm(`Delete ${u.name}?`)) deleteUser(u.id); }} className="p-1.5 rounded hover:bg-gray-100 text-red-500"><Trash2 size={15} /></button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal && (
        <UserModal
          existing={modal === 'add' ? undefined : modal as User}
          onSave={(d) => {
            if (modal === 'add') addUser(d);
            else updateUser((modal as User).id, d);
            setModal(null);
          }}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}

function UserModal({ existing, onSave, onClose }: { existing?: User; onSave: (d: Omit<User, 'id'>) => void; onClose: () => void }) {
  const [name, setName] = useState(existing?.name ?? '');
  const [username, setUsername] = useState(existing?.username ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [role, setRole] = useState<User['role']>(existing?.role ?? 'operator');
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');

  function save() {
    if (!name || !username) { setErr('Name and username are required'); return; }
    if (!existing && !pw) { setErr('Password is required for new users'); return; }
    const ph = pw ? hashPassword(pw) : (existing?.passwordHash ?? '');
    onSave({ name, username, email, role, passwordHash: ph });
  }

  return (
    <Modal title={existing ? 'Edit User' : 'Add User'} onClose={onClose} size="sm">
      <div className="space-y-4">
        <div><label className="label">Full Name *</label><input className="input" value={name} onChange={e => setName(e.target.value)} /></div>
        <div><label className="label">Username *</label><input className="input" value={username} onChange={e => setUsername(e.target.value)} /></div>
        <div><label className="label">Email</label><input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} /></div>
        <div>
          <label className="label">Role</label>
          <select className="input" value={role} onChange={e => setRole(e.target.value as User['role'])}>
            <option value="admin">Admin — Full access</option>
            <option value="operator">Operator — Log and dispatch</option>
            <option value="viewer">Viewer — Read only</option>
          </select>
        </div>
        <div><label className="label">{existing ? 'New Password (leave blank to keep)' : 'Password *'}</label><input type="password" className="input" value={pw} onChange={e => setPw(e.target.value)} /></div>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <div className="flex gap-3 justify-end pt-2">
          <button onClick={onClose} className="btn-secondary text-sm">Cancel</button>
          <button onClick={save} className="btn-primary text-sm">Save</button>
        </div>
      </div>
    </Modal>
  );
}
