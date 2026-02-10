import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Users, Radio, Activity, Video, LogOut, Home, Menu, X } from 'lucide-react';

export const Layout: React.FC = () => {
    const navigate = useNavigate();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    const handleLogout = () => {
        localStorage.removeItem('dtelecom_admin');
        navigate('/');
    };

    const navItems = [
        { path: '/dashboard', label: 'Home', icon: Home },
        { path: '/users', label: 'Users', icon: Users },
        { path: '/rooms', label: 'Rooms', icon: Radio },
        { path: '/online', label: 'Online Users', icon: Activity },
        { path: '/recordings', label: 'Recordings', icon: Video },
    ];

    const closeMobileMenu = () => {
        setIsMobileMenuOpen(false);
    };

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex">
            {/* Mobile Menu Button */}
            <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg shadow-lg"
            >
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Mobile Overlay */}
            {isMobileMenuOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-30"
                    onClick={closeMobileMenu}
                />
            )}

            {/* Sidebar */}
            <aside className={`
                w-64 bg-slate-900 border-r border-slate-800 flex flex-col fixed h-full z-40 text-white
                transition-transform duration-300 ease-in-out
                ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
            `}>
                <div className="p-6 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                        {/* Small Logo in Sidebar */}
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">D Telecom</h1>
                            <p className="text-xs text-slate-400">Admin Panel</p>
                        </div>
                    </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                    {navItems.map((item) => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={closeMobileMenu}
                            className={({ isActive }) =>
                                `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors font-medium ${isActive
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20'
                                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`
                            }
                        >
                            <item.icon size={20} />
                            {item.label}
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <button
                        onClick={handleLogout}
                        className="w-full flex items-center justify-center gap-2 text-red-400 hover:bg-red-900/20 py-2 rounded transition-colors"
                    >
                        <LogOut size={16} /> Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-screen bg-gray-50 pt-16 lg:pt-8">
                <Outlet />
            </main>
        </div>
    );
};
