import React from 'react';
import { MicOff, LogOut } from 'lucide-react';

interface User {
    id: string;
    username: string;
    full_name: string;
    status: string;
    is_online: boolean;
    device_id: string;
}

interface UserCardProps {
    user: User;
    isSpeaking?: boolean;
    onMute: (userId: string) => void;
    onKick: (userId: string) => void;
}

export const UserCard: React.FC<UserCardProps> = ({ user, isSpeaking, onMute, onKick }) => {
    return (
        <div className={`p-4 rounded-lg border-2 ${isSpeaking ? 'border-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] bg-red-50' : user.is_online ? 'border-green-500/30 bg-white' : 'border-gray-200 bg-gray-50'} flex flex-col gap-3 shadow-sm transition-all hover:shadow-md hover:scale-[1.02]`}>
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">{user.full_name || user.username}</h3>
                <span className={`w-3 h-3 rounded-full ${user.is_online ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`}></span>
            </div>

            <div className="text-sm text-gray-500">
                <p>Username: <span className="font-medium text-gray-700">{user.username}</span></p>
                <p>Status: <span className={`font-medium ${user.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>{user.status}</span></p>
                <p className="text-xs truncate mt-1" title={user.device_id}>Device: {user.device_id || 'None'}</p>
            </div>

            <div className="flex gap-2 mt-auto pt-2">
                <button
                    onClick={() => onMute(user.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white py-2 rounded transition-colors text-sm font-medium"
                    title="Mute User"
                >
                    <MicOff size={16} /> Mute
                </button>
                <button
                    onClick={() => onKick(user.id)}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded transition-colors text-sm font-medium"
                    title="Kick User"
                >
                    <LogOut size={16} /> Kick
                </button>
            </div>
        </div>
    );
};
