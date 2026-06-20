import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutGrid, PlusCircle, PackageMinus, Wheat, LogOut, Monitor } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const tabs = [
  { to: '/m', icon: LayoutGrid, label: 'Overview', end: true },
  { to: '/m/add', icon: PlusCircle, label: 'Add' },
  { to: '/m/checkout', icon: PackageMinus, label: 'Checkout' },
];

export default function MobileLayout() {
  const { currentUser, logout } = useAuth();
  const nav = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative">
      {/* Top bar */}
      <header className="sticky top-0 z-20 bg-green-900 text-white px-4 py-3 flex items-center justify-between shadow-md">
        <div className="flex items-center gap-2.5">
          <div className="bg-green-700 p-1.5 rounded-lg">
            <Wheat size={18} className="text-green-200" />
          </div>
          <div className="leading-tight">
            <p className="font-bold text-sm">SFA Rice</p>
            <p className="text-green-400 text-[11px]">Stockpile Manager</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => nav('/')}
            title="Desktop view"
            className="p-2 rounded-lg hover:bg-green-800 text-green-200"
          >
            <Monitor size={18} />
          </button>
          <button
            onClick={logout}
            title="Sign out"
            className="p-2 rounded-lg hover:bg-green-800 text-green-200"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* User strip */}
      <div className="bg-white px-4 py-2 border-b border-gray-100 flex items-center gap-2">
        <div className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
          {currentUser?.name.charAt(0)}
        </div>
        <span className="text-xs text-gray-600">{currentUser?.name}</span>
        <span className="text-[10px] text-gray-400 capitalize px-1.5 py-0.5 bg-gray-100 rounded">{currentUser?.role}</span>
      </div>

      {/* Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 flex z-20 pb-[env(safe-area-inset-bottom)]">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors ${
                isActive ? 'text-green-700' : 'text-gray-400'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <t.icon size={22} strokeWidth={isActive ? 2.4 : 1.8} />
                <span className={`text-[11px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{t.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
