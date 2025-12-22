import React from 'react';
import { type LucideIcon } from 'lucide-react';

interface StatsCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color: string; // e.g., 'blue', 'green', 'red'
}

export const StatsCard: React.FC<StatsCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorClasses: Record<string, string> = {
        blue: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
        green: 'bg-green-500/10 text-green-500 border-green-500/20',
        red: 'bg-red-500/10 text-red-500 border-red-500/20',
        yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
        purple: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    };

    return (
        <div className={`p-4 rounded-lg border ${colorClasses[color] || colorClasses.blue} flex items-center gap-4 bg-white shadow-sm`}>
            <div className={`p-3 rounded-full ${colorClasses[color]?.replace('border', 'bg').replace('/20', '/20') || 'bg-blue-500/20'}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-sm text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
            </div>
        </div>
    );
};
