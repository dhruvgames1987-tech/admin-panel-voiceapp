import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StatsCard } from '../components/StatsCard';
import { Radio, CheckCircle, XCircle, Play, StopCircle, Trash2, LogOut, Eraser, Mic, MicOff } from 'lucide-react';
import { Modal } from '../components/Modal';
import { logoutAllParticipants, muteAllParticipants, unmuteAllParticipants } from '../lib/api';

interface Room {
    id: number;
    name: string;
    is_active: boolean;
    created_at: string;
    participant_count?: number;
}

export const Rooms: React.FC = () => {
    const [rooms, setRooms] = useState<Room[]>([]);
    const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [roomName, setRoomName] = useState('');

    useEffect(() => {
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        const { data: roomsData, error: roomsError } = await supabase
            .from('rooms')
            .select('*')
            .order('created_at', { ascending: false });

        if (roomsError) {
            console.error(roomsError);
            return;
        }

        // Fetch online users to count participants
        const { data: usersData } = await supabase
            .from('users')
            .select('current_room_id')
            .eq('is_online', true);

        if (roomsData) {
            const roomsWithCounts = roomsData.map(room => {
                const count = usersData ? usersData.filter(u => u.current_room_id === room.id).length : 0;
                return { ...room, participant_count: count };
            });

            setRooms(roomsWithCounts);
            setStats({
                total: roomsData.length,
                active: roomsData.filter(r => r.is_active).length,
                disabled: roomsData.filter(r => !r.is_active).length,
            });
        }
    };

    const handleCreateRoom = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!roomName.trim()) return;

        const { error } = await supabase.from('rooms').insert([{
            name: roomName,
            is_active: true
        }]);

        if (error) {
            alert('Error creating room: ' + error.message);
        } else {
            setIsModalOpen(false);
            setRoomName('');
            fetchRooms();
        }
    };

    const toggleRoomStatus = async (room: Room) => {
        const newStatus = !room.is_active;
        await supabase.from('rooms').update({ is_active: newStatus }).eq('id', room.id);
        fetchRooms();
    };

    const clearPlatform = async (roomName: string) => {
        if (!confirm(`Clear all data for room "${roomName}"? This cannot be undone.`)) return;
        alert('Clear platform functionality would be implemented here');
    };

    const closeRoom = async (roomId: number, roomName: string) => {
        if (!confirm('This will close the room and disconnect all users. Continue?')) return;

        try {
            // Logout all participants from LiveKit
            await logoutAllParticipants(roomName);

            // Disable the room
            await supabase.from('rooms').update({ is_active: false }).eq('id', roomId);

            fetchRooms();
            alert('Room closed and all users logged out');
        } catch (error) {
            console.error('Error closing room:', error);
            alert('Failed to close room');
        }
    };

    const logoutAllFromRoom = async (roomName: string) => {
        if (!confirm(`Logout all users from "${roomName}"?`)) return;

        try {
            await logoutAllParticipants(roomName);
            alert('All users logged out');
        } catch (error) {
            console.error('Error logging out users:', error);
            alert('Failed to logout users');
        }
    };

    const muteRoom = async (roomName: string) => {
        if (!confirm(`Mute all users in "${roomName}"?`)) return;

        try {
            await muteAllParticipants(roomName);
            alert(`All users muted in ${roomName}`);
        } catch (error) {
            console.error('Error muting room:', error);
            alert('Failed to mute room');
        }
    };

    const unmuteRoom = async (roomName: string) => {
        if (!confirm(`Unmute all users in "${roomName}"?`)) return;

        try {
            await unmuteAllParticipants(roomName);
            alert(`All users unmuted in ${roomName}`);
        } catch (error) {
            console.error('Error unmuting room:', error);
            alert('Failed to unmute room');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Rooms Management</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
                >
                    + Create Room
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard title="Total Rooms" value={stats.total} icon={Radio} color="blue" />
                <StatsCard title="Active Rooms" value={stats.active} icon={CheckCircle} color="green" />
                <StatsCard title="Disabled Rooms" value={stats.disabled} icon={XCircle} color="red" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Room Name</th>
                            <th className="px-6 py-3 font-semibold">Participants</th>
                            <th className="px-6 py-3 font-semibold">Platform</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                            <th className="px-6 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {rooms.map(room => (
                            <tr key={room.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{room.name}</td>
                                <td className="px-6 py-4">{room.participant_count || 0}</td>
                                <td className="px-6 py-4">Hybrid</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${room.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {room.is_active ? 'Active' : 'Disabled'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <button onClick={() => muteRoom(room.name)} title="Mute All Users" className="p-1 hover:text-yellow-600 text-gray-400 transition-colors">
                                        <MicOff size={18} />
                                    </button>
                                    <button onClick={() => unmuteRoom(room.name)} title="Unmute All Users" className="p-1 hover:text-green-600 text-gray-400 transition-colors">
                                        <Mic size={18} />
                                    </button>
                                    <button onClick={() => toggleRoomStatus(room)} title={room.is_active ? 'Stop Room' : 'Start Room'} className="p-1 hover:text-blue-600 text-gray-400 transition-colors">
                                        {room.is_active ? <StopCircle size={18} /> : <Play size={18} />}
                                    </button>
                                    <button onClick={() => clearPlatform(room.name)} title="Clear Platform" className="p-1 hover:text-purple-600 text-gray-400 transition-colors">
                                        <Eraser size={18} />
                                    </button>
                                    <button onClick={() => logoutAllFromRoom(room.name)} title="Logout All Users" className="p-1 hover:text-orange-600 text-gray-400 transition-colors">
                                        <LogOut size={18} />
                                    </button>
                                    <button onClick={() => closeRoom(room.id, room.name)} title="Close Room & Logout All" className="p-1 hover:text-red-600 text-gray-400 transition-colors">
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Create Room Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Room">
                <form onSubmit={handleCreateRoom} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
                        <input
                            required
                            type="text"
                            value={roomName}
                            onChange={e => setRoomName(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            placeholder="e.g., General Assembly"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors"
                    >
                        Create Room
                    </button>
                </form>
            </Modal>
        </div>
    );
};
