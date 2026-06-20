import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Boxes, Package, FileText, Settings, Users, LogOut, Wheat,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/warehouse', icon: Boxes, label: 'Warehouse View' },
  { to: '/containers', icon: Package, label: 'Container Log' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/settings', icon: Settings, label: 'Settings', adminOnly: true },
  { to: '/users', icon: Users, label: 'Users', adminOnly: true },
];

export default function Sidebar() {
  const { currentUser, logout } = useAuth();

  return (
    <aside className="w-64 min-h-screen bg-green-900 text-white flex flex-col">
      {/* Brand */}
      <div className="px-6 py-5 border-b border-green-800">
        <div className="flex items-center gap-3">
          <div className="bg-green-700 p-2 rounded-lg">
            <Wheat size={22} className="text-green-200" />
          </div>
          <div>
            <p className="font-bold text-sm leading-tight">SFA Rice</p>
            <p className="text-green-400 text-xs">Stockpile Manager</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(item => {
          if (item.adminOnly && currentUser?.role !== 'admin') return null;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-green-700 text-white'
                    : 'text-green-200 hover:bg-green-800 hover:text-white'
                }`
              }
            >
              <item.icon size={18} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="px-4 py-4 border-t border-green-800">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-sm font-bold">
            {currentUser?.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentUser?.name}</p>
            <p className="text-xs text-green-400 capitalize">{currentUser?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-green-300 hover:bg-green-800 hover:text-white transition-colors"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
