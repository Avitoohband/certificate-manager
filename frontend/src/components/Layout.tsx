import { Outlet, Link, useNavigate } from 'react-router-dom';
import { Shield, LogOut, User, FileText, Activity } from 'lucide-react';
import { useAuthStore } from '../store/auth.store';

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="w-8 h-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">Certificate Manager</span>
            </div>

            <div className="flex items-center gap-6">
              <nav className="hidden md:flex gap-6">
                <Link
                  to="/"
                  className="text-gray-600 hover:text-gray-900 font-medium transition"
                >
                  Dashboard
                </Link>
                <Link
                  to="/certificates"
                  className="text-gray-600 hover:text-gray-900 font-medium transition"
                >
                  Certificates
                </Link>
                {user?.role === 'admin' && (
                  <Link
                    to="/audit"
                    className="text-gray-600 hover:text-gray-900 font-medium transition"
                  >
                    Audit Logs
                  </Link>
                )}
              </nav>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-700">{user?.email}</span>
                  <span className="px-2 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">
                    {user?.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}

