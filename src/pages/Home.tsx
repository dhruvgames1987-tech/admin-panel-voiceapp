import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StatsCard } from '../components/StatsCard';
import { Users, Activity, UserX, MicOff, Mic, LogOut } from 'lucide-react';

import { muteAllParticipants, logoutAllParticipants } from '../lib/api';

export const Home: React.FC = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        disabledUsers: 0,
    });

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        const { count: total } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: active } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_online', true);
        const { count: disabled } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'disabled');

        setStats({
            totalUsers: total || 0,
            activeUsers: active || 0,
            disabledUsers: disabled || 0,
        });
    };

    const handleGlobalAction = async (action: string) => {
        if (!confirm(`Are you sure you want to ${action}?`)) return;

        try {
            if (action === 'Mute All') {
                await muteAllParticipants('General Assembly');
            } else if (action === 'Logout All') {
                await logoutAllParticipants('General Assembly');
                // Also update DB
                await supabase.from('users').update({ status: 'force_logout', is_online: false }).neq('role', 'admin');
            } else {
                alert(`${action} not fully implemented yet`);
                return;
            }
            alert(`${action} command sent successfully`);
        } catch (e) {
            console.error(e);
            alert(`Failed to execute ${action}`);
        }
    };

    return (
        <div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6 sm:mb-8">Dashboard Overview</h2>

            {/* Global Controls */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6 sm:mb-8">
                <button onClick={() => handleGlobalAction('Mute All')} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold shadow-md transition-all hover:scale-105">
                    <MicOff size={18} className="sm:w-5 sm:h-5" /> Mute All
                </button>
                <button onClick={() => handleGlobalAction('Unmute All')} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-all hover:scale-105">
                    <Mic size={18} className="sm:w-5 sm:h-5" /> Unmute All
                </button>
                <button onClick={() => handleGlobalAction('Logout All')} className="flex items-center justify-center gap-2 px-4 sm:px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-md transition-all hover:scale-105">
                    <LogOut size={18} className="sm:w-5 sm:h-5" /> Logout All
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <StatsCard title="Total Users" value={stats.totalUsers} icon={Users} color="blue" />
                <StatsCard title="Active Users" value={stats.activeUsers} icon={Activity} color="green" />
                <StatsCard title="Disabled Users" value={stats.disabledUsers} icon={UserX} color="red" />
            </div>

            {/* Recent Activity (Placeholder) */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">System Status</h3>
                <p className="text-sm sm:text-base text-gray-500">System is running normally. All services are operational.</p>
            </div>
        </div>
    );
};
