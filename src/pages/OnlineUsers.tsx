import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { UserCard } from '../components/UserCard';
import { Users, MicOff, Mic, LogOut, Radio, Filter } from 'lucide-react';
import { muteAllParticipants, unmuteAllParticipants, logoutAllParticipants, logoutUser } from '../lib/api';
import { AudioController } from '../components/AudioController';

interface User {
    id: string;
    username: string;
    full_name: string;
    status: string;
    is_online: boolean;
    device_id: string;
    role: string;
    current_room_id: number | null;
}

interface Room {
    id: number;
    name: string;
    is_active: boolean;
}

import { LiveKitRoom, useRoomContext } from '@livekit/components-react';
import { RoomEvent } from 'livekit-client';
import { generateToken } from '../lib/api';

// Component to monitor speakers within a single LiveKit room context
const SpeakerMonitor = ({ roomName, onSpeakersChanged }: { roomName: string; onSpeakersChanged: (roomName: string, speakers: string[]) => void }) => {
    const room = useRoomContext();

    useEffect(() => {
        if (!room) return;

        const handleActiveSpeakersChange = (speakers: any[]) => {
            const speakerIdentities = speakers.map(s => s.identity);
            onSpeakersChanged(roomName, speakerIdentities);
        };

        room.on(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChange);

        return () => {
            room.off(RoomEvent.ActiveSpeakersChanged, handleActiveSpeakersChange);
        };
    }, [room, roomName, onSpeakersChanged]);

    return null;
};

// Component to connect to a single room and monitor speakers
const RoomSpeakerMonitor = ({
    roomName,
    liveKitUrl,
    onSpeakersChanged
}: {
    roomName: string;
    liveKitUrl: string;
    onSpeakersChanged: (roomName: string, speakers: string[]) => void;
}) => {
    const [token, setToken] = useState<string>('');

    useEffect(() => {
        const getToken = async () => {
            try {
                const t = await generateToken('admin-monitor-' + roomName.replace(/\s+/g, '-').toLowerCase() + '-' + Math.random().toString(36).substr(2, 5), roomName);
                setToken(t);
            } catch (e) {
                console.error(`Failed to get monitor token for room ${roomName}:`, e);
            }
        };
        getToken();
    }, [roomName]);

    if (!token) return null;

    return (
        <LiveKitRoom
            token={token}
            serverUrl={liveKitUrl}
            connect={true}
            audio={false}
            video={false}
        >
            <SpeakerMonitor roomName={roomName} onSpeakersChanged={onSpeakersChanged} />
        </LiveKitRoom>
    );
};

export const OnlineUsers: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [selectedRoomId, setSelectedRoomId] = useState<number | 'all'>('all');
    const [broadcastingRoom, setBroadcastingRoom] = useState<string | null>(null);
    const [speakingUsers, setSpeakingUsers] = useState<Set<string>>(new Set());
    // Track speakers per room
    const [roomSpeakers, setRoomSpeakers] = useState<Map<string, string[]>>(new Map());
    // Self-Hosted LiveKit Server
    const liveKitUrl = 'wss://meet.dhruvmusic.co.in';

    // Get the selected room name for operations
    const getSelectedRoomName = useCallback(() => {
        if (selectedRoomId === 'all') return null;
        const room = rooms.find(r => r.id === selectedRoomId);
        return room?.name || null;
    }, [selectedRoomId, rooms]);

    // Handle speakers changed for a specific room
    const handleRoomSpeakersChanged = useCallback((roomName: string, speakers: string[]) => {
        setRoomSpeakers(prev => {
            const newMap = new Map(prev);
            newMap.set(roomName, speakers);
            return newMap;
        });
    }, []);

    // Aggregate all speaking users from all rooms
    useEffect(() => {
        const allSpeakers = new Set<string>();
        roomSpeakers.forEach((speakers) => {
            speakers.forEach(s => allSpeakers.add(s));
        });
        setSpeakingUsers(allSpeakers);
    }, [roomSpeakers]);

    useEffect(() => {
        fetchUsers();
        fetchRooms();

        // Real-time subscription
        const channel = supabase
            .channel('public:users')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, (payload) => {
                console.log('Change received!', payload);
                fetchUsers();
            })
            .subscribe((status) => {
                console.log('Subscription status:', status);
            });

        // Polling fallback
        const pollInterval = setInterval(() => {
            fetchUsers();
        }, 5000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(pollInterval);
        };
    }, []);

    const fetchRooms = async () => {
        const { data, error } = await supabase
            .from('rooms')
            .select('*')
            .eq('is_active', true)
            .order('name', { ascending: true });

        if (data) setRooms(data);
        if (error) console.error('Error fetching rooms:', error);
    };

    const fetchUsers = async () => {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('is_online', true)
            .order('username', { ascending: true });

        if (data) setUsers(data);
        if (error) console.error('Error fetching users:', error);
    };

    // Filter users based on selected room
    const filteredUsers = selectedRoomId === 'all'
        ? users
        : users.filter(u => u.current_room_id === selectedRoomId);

    // Get room name for a user
    const getRoomName = (roomId: number | null) => {
        if (!roomId) return 'Unassigned';
        const room = rooms.find(r => r.id === roomId);
        return room?.name || 'Unknown';
    };

    // Count users per room
    const getUserCountByRoom = (roomId: number) => {
        return users.filter(u => u.current_room_id === roomId).length;
    };

    const handleMute = async (userId: string) => {
        console.log('Mute requested for:', userId);
        alert(`To mute a specific user, please use the Room controls or 1-on-1 view.`);
    };

    const handleKick = async (userId: string) => {
        if (!confirm('Are you sure you want to kick this user?')) return;

        const user = users.find(u => u.id === userId);
        if (!user) {
            alert('User not found');
            return;
        }

        const roomName = getRoomName(user.current_room_id);

        try {
            const { error: dbError } = await supabase
                .from('users')
                .update({ status: 'force_logout', is_online: false })
                .eq('id', userId);

            if (dbError) {
                throw new Error('Failed to update user status: ' + dbError.message);
            }

            try {
                await logoutUser(roomName, user.username);
            } catch (liveKitError) {
                console.warn('LiveKit logout failed (user may not be in room):', liveKitError);
            }

            alert('User kicked successfully');
            fetchUsers();

        } catch (e) {
            console.error('Error kicking user:', e);
            alert(e instanceof Error ? e.message : 'Failed to kick user');
        }
    };

    const handleMuteAll = async () => {
        const roomName = getSelectedRoomName();
        if (selectedRoomId === 'all') {
            if (!confirm('Mute ALL users in ALL rooms? This will affect everyone.')) return;
            // Mute all rooms
            try {
                for (const room of rooms) {
                    await muteAllParticipants(room.name);
                }
                alert('Mute All command sent to all rooms');
            } catch (e) {
                console.error(e);
                alert('Failed to mute all');
            }
        } else {
            if (!roomName) {
                alert('Please select a room first');
                return;
            }
            if (!confirm(`Mute ALL users in "${roomName}"?`)) return;
            try {
                await muteAllParticipants(roomName);
                alert(`Mute All command sent to ${roomName}`);
            } catch (e) {
                console.error(e);
                alert('Failed to mute all');
            }
        }
    };

    const handleUnmuteAll = async () => {
        const roomName = getSelectedRoomName();
        if (selectedRoomId === 'all') {
            if (!confirm('Unmute ALL users in ALL rooms?')) return;
            try {
                for (const room of rooms) {
                    await unmuteAllParticipants(room.name);
                }
                alert('Unmute All command sent to all rooms');
            } catch (e) {
                console.error(e);
                alert('Failed to unmute all');
            }
        } else {
            if (!roomName) {
                alert('Please select a room first');
                return;
            }
            if (!confirm(`Unmute ALL users in "${roomName}"?`)) return;
            try {
                await unmuteAllParticipants(roomName);
                alert(`Unmute All command sent to ${roomName}`);
            } catch (e) {
                console.error(e);
                alert('Failed to unmute all');
            }
        }
    };

    const handleLogoutAll = async () => {
        const roomName = getSelectedRoomName();
        if (selectedRoomId === 'all') {
            if (!confirm('DANGER: This will log out ALL users from ALL rooms. Continue?')) return;
            try {
                for (const room of rooms) {
                    await logoutAllParticipants(room.name);
                }
                const { error } = await supabase
                    .from('users')
                    .update({ status: 'force_logout', is_online: false })
                    .neq('role', 'admin');

                if (error) throw error;
                alert('All users logged out from all rooms');
            } catch (e) {
                console.error(e);
                alert('Failed to logout all');
            }
        } else {
            if (!roomName) {
                alert('Please select a room first');
                return;
            }
            if (!confirm(`DANGER: This will log out ALL users from "${roomName}". Continue?`)) return;
            try {
                await logoutAllParticipants(roomName);

                const { error } = await supabase
                    .from('users')
                    .update({ status: 'force_logout', is_online: false })
                    .eq('current_room_id', selectedRoomId)
                    .neq('role', 'admin');

                if (error) throw error;
                alert(`All users logged out from ${roomName}`);
            } catch (e) {
                console.error(e);
                alert('Failed to logout all');
            }
        }
    };

    const toggleBroadcast = () => {
        if (broadcastingRoom) {
            setBroadcastingRoom(null);
        } else {
            const roomName = getSelectedRoomName();
            if (selectedRoomId === 'all') {
                alert('Please select a specific room to broadcast to');
                return;
            }
            if (roomName) {
                setBroadcastingRoom(roomName);
            }
        }
    };

    return (
        <div>
            <header className="flex flex-col gap-4 mb-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Online Users</h2>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
                                {filteredUsers.length} online
                            </span>
                        </div>
                        <p className="text-sm sm:text-base text-gray-500">Real-time monitoring of active participants</p>
                    </div>
                </div>

                {/* Room Filter */}
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2">
                        <Filter size={18} className="text-gray-500" />
                        <span className="font-medium text-gray-700">Filter by Room:</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => setSelectedRoomId('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedRoomId === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            All Rooms ({users.length})
                        </button>
                        {rooms.map(room => (
                            <button
                                key={room.id}
                                onClick={() => setSelectedRoomId(room.id)}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedRoomId === room.id
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {room.name} ({getUserCountByRoom(room.id)})
                            </button>
                        ))}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                    <button
                        onClick={toggleBroadcast}
                        disabled={selectedRoomId === 'all'}
                        className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors shadow-lg ${broadcastingRoom
                            ? 'bg-green-600 hover:bg-green-700 text-white'
                            : selectedRoomId === 'all'
                                ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                            }`}
                    >
                        <Radio size={18} className={broadcastingRoom ? 'animate-pulse' : ''} />
                        {broadcastingRoom ? 'Stop Broadcasting' : 'Broadcast Audio'}
                    </button>
                    <button
                        onClick={handleMuteAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-yellow-900/20"
                    >
                        <MicOff size={18} />
                        Mute {selectedRoomId === 'all' ? 'All Rooms' : 'Room'}
                    </button>
                    <button
                        onClick={handleUnmuteAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
                    >
                        <Mic size={18} />
                        Unmute {selectedRoomId === 'all' ? 'All Rooms' : 'Room'}
                    </button>
                    <button
                        onClick={handleLogoutAll}
                        className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-red-900/20"
                    >
                        <LogOut size={18} />
                        Logout {selectedRoomId === 'all' ? 'All Rooms' : 'Room'}
                    </button>
                </div>
            </header>

            {/* LiveKit Connection for Monitoring - One connection per room */}
            {rooms.map(room => (
                <RoomSpeakerMonitor
                    key={room.id}
                    roomName={room.name}
                    liveKitUrl={liveKitUrl}
                    onSpeakersChanged={handleRoomSpeakersChanged}
                />
            ))}

            {/* User Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {filteredUsers.map(user => (
                    <div key={user.id} className="relative">
                        <UserCard
                            user={user}
                            isSpeaking={speakingUsers.has(user.username)}
                            onMute={() => handleMute(user.id)}
                            onKick={() => handleKick(user.id)}
                        />
                        {/* Room Badge */}
                        <div className="absolute top-2 right-2 px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-medium">
                            {getRoomName(user.current_room_id)}
                        </div>
                    </div>
                ))}

                {filteredUsers.length === 0 && (
                    <div className="col-span-full text-center py-20 text-gray-500">
                        <Users size={48} className="mx-auto mb-4 opacity-50" />
                        <p>No online users found{selectedRoomId !== 'all' ? ` in ${getSelectedRoomName()}` : ''}.</p>
                    </div>
                )}
            </div>

            {broadcastingRoom && (
                <AudioController
                    roomName={broadcastingRoom}
                    username="admin-web-broadcast"
                    onClose={() => setBroadcastingRoom(null)}
                />
            )}
        </div>
    );
};
