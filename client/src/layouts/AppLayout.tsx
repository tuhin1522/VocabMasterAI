import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BookOpen, RefreshCw, Library, Zap, Trophy,
  BarChart2, User, Search, Settings, LogOut, ChevronLeft, ChevronRight,
  BookMarked, Shield, Menu, X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/learn', icon: BookOpen, label: 'Learn' },
  { to: '/revision', icon: RefreshCw, label: 'Revision' },
  { to: '/vocabulary', icon: Library, label: 'Vocabulary' },
  { to: '/weak-words', icon: Zap, label: 'Weak Words' },
  { to: '/challenges', icon: Trophy, label: 'Challenges' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/search', icon: Search, label: 'Search' },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg)' }}>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:relative z-50 flex flex-col h-full transition-all duration-300
          ${collapsed ? 'w-20' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        style={{
          background: 'var(--color-surface)',
          borderRight: '1px solid var(--color-border)',
        }}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
          {!collapsed && (
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                V
              </div>
              <div>
                <div className="font-bold text-sm gradient-text">VocabMaster</div>
                <div style={{ color: 'var(--color-text-faint)', fontSize: '10px' }}>AI Learning</div>
              </div>
            </div>
          )}
          {collapsed && (
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm mx-auto"
              style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
            >
              V
            </div>
          )}
          <button
            className="hidden lg:flex p-1.5 rounded-lg transition-colors hover:bg-opacity-10"
            style={{ color: 'var(--color-text-muted)' }}
            onClick={() => setCollapsed(!collapsed)}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? label : undefined}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} />
              {!collapsed && <span>{label}</span>}
            </NavLink>
          ))}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t space-y-1" style={{ borderColor: 'var(--color-border)' }}>
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              title={collapsed ? 'Admin' : undefined}
            >
              <Shield size={18} />
              {!collapsed && <span>Admin</span>}
            </NavLink>
          )}
          <NavLink
            to="/profile"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            title={collapsed ? 'Profile' : undefined}
            onClick={() => setMobileOpen(false)}
          >
            <User size={18} />
            {!collapsed && <span>Profile</span>}
          </NavLink>
          <button
            className="nav-item w-full text-left"
            style={{ color: '#ef4444' }}
            onClick={handleLogout}
            title={collapsed ? 'Logout' : undefined}
          >
            <LogOut size={18} />
            {!collapsed && <span>Logout</span>}
          </button>

          {/* User info */}
          {!collapsed && (
            <div
              className="flex items-center gap-3 p-3 rounded-xl mt-2"
              style={{ background: 'var(--color-surface-2)' }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
              >
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: 'var(--color-text)' }}>
                  {user?.name}
                </div>
                <div className="text-xs truncate" style={{ color: 'var(--color-text-faint)' }}>
                  {user?.email}
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header */}
        <header
          className="lg:hidden flex items-center justify-between p-4 border-b flex-shrink-0"
          style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}
        >
          <button onClick={() => setMobileOpen(true)} style={{ color: 'var(--color-text)' }}>
            <Menu size={22} />
          </button>
          <div className="font-bold gradient-text">VocabMaster AI</div>
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs"
            style={{ background: 'linear-gradient(135deg, #6366f1, #8b5cf6)' }}
          >
            {user?.name?.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
