import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { StatsCard } from '../components/StatsCard';
import { Modal } from '../components/Modal';
import { Users as UsersIcon, UserCheck, UserX, Edit, Trash2, Share2, Smartphone } from 'lucide-react';
import { getCurrentAdmin } from '../lib/useCurrentAdmin';

interface User {
    id: string;
    username: string;
    full_name: string;
    status: string;
    is_online: boolean;
    current_room_id: number | null;
    last_login: string;
    role?: string;
    device_name?: string;
    device_lock?: boolean;
    password?: string; // Password field for sharing
    created_by?: string; // ID of admin who created this user
}

export const Users: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [stats, setStats] = useState({ total: 0, active: 0, disabled: 0 });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '', full_name: '', room_id: '', notes: '', role: 'user' });
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [newlyCreatedUser, setNewlyCreatedUser] = useState<{ username: string; password: string; roomName: string } | null>(null);

    // Get current admin for role-based filtering
    const currentAdmin = getCurrentAdmin();

    useEffect(() => {
        fetchUsers();
        fetchRooms();
    }, []);

    const fetchRooms = async () => {
        const { data } = await supabase.from('rooms').select('*').eq('is_active', true);
        if (data) setRooms(data);
    };

    const fetchUsers = async () => {
        let query = supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });

        // If current admin is NOT a super_admin, filter by created_by
        // Super admins see everyone, regular admins only see their created users
        if (currentAdmin && currentAdmin.role !== 'super_admin') {
            query = query.eq('created_by', currentAdmin.id);
        }

        const { data, error } = await query;

        if (data) {
            setUsers(data);
            setStats({
                total: data.length,
                active: data.filter(u => u.status === 'active').length,
                disabled: data.filter(u => u.status === 'disabled').length,
            });
        }
        if (error) console.error(error);
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate room assignment is required
        if (!formData.room_id) {
            alert('Please assign the user to a room. Room assignment is required.');
            return;
        }

        if (editingUserId) {
            // Update existing user
            const updates: any = {
                username: formData.username,
                full_name: formData.full_name,
                role: formData.role,
                current_room_id: parseInt(formData.room_id),
            };
            // Only update password if provided
            if (formData.password) {
                // In a real app, hash this!
                updates.password = formData.password;
            }

            console.log('Updating user with:', updates);

            const { data, error } = await supabase
                .from('users')
                .update(updates)
                .eq('id', editingUserId)
                .select(); // Add select to return updated data

            if (error) {
                console.error('Update error:', error);
                alert('Error updating user: ' + error.message);
            } else {
                console.log('User updated successfully:', data);
                const roomName = rooms.find(r => r.id === parseInt(formData.room_id))?.name;
                alert(`User updated successfully!\nAssigned to room: ${roomName}`);
                setIsModalOpen(false);
                setEditingUserId(null);
                setFormData({ username: '', password: '', full_name: '', room_id: '', notes: '', role: 'user' });
                fetchUsers();
            }
        } else {
            // Create new user - save password for sharing
            const plainPassword = formData.password;
            const roomName = rooms.find(r => r.id === parseInt(formData.room_id))?.name || 'Unassigned';

            const { error } = await supabase.from('users').insert([{
                username: formData.username,
                full_name: formData.full_name,
                role: formData.role,
                status: 'active',
                password: plainPassword, // In real app, hash this
                current_room_id: parseInt(formData.room_id),
                created_by: currentAdmin?.id, // Track which admin created this user
            }]);

            if (error) {
                alert('Error adding user: ' + error.message);
            } else {
                // Store the newly created user info with plain password
                setNewlyCreatedUser({
                    username: formData.username,
                    password: plainPassword,
                    roomName: roomName
                });
                setIsModalOpen(false);
                setFormData({ username: '', password: '', full_name: '', room_id: '', notes: '', role: 'user' });
                fetchUsers();
            }
        }
    };

    const handleEditUser = (user: User) => {
        setEditingUserId(user.id);
        setFormData({
            username: user.username,
            password: '', // Don't show existing password
            full_name: user.full_name || '',
            room_id: user.current_room_id ? String(user.current_room_id) : '',
            notes: '', // Notes field is not in User interface, so it's empty
            role: user.role || 'user'
        });
        setIsModalOpen(true);
    };

    const deleteUser = async (userId: string) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return;
        await supabase.from('users').delete().eq('id', userId);
        fetchUsers();
    };

    const toggleDeviceLock = async (user: User) => {
        const newLockStatus = !user.device_lock;
        await supabase.from('users').update({ device_lock: newLockStatus }).eq('id', user.id);
        fetchUsers();
    };

    const logoutUser = async (userId: string, username: string) => {
        if (!confirm(`Are you sure you want to logout ${username}?`)) return;

        const { error } = await supabase
            .from('users')
            .update({ status: 'force_logout', is_online: false })
            .eq('id', userId);

        if (error) {
            alert('Error logging out user: ' + error.message);
        } else {
            alert(`${username} has been logged out successfully`);
            fetchUsers();
        }
    };

    const shareOnWhatsApp = (username: string, password: string, roomName: string) => {
        const text = `*D Telecom Login Details*\n\n*Username:* ${username}\n*Password:* ${password}\n*Assigned Room:* ${roomName}\n\nPlease login using the app.`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    const shareExistingUser = (user: User) => {
        const roomName = rooms.find(r => r.id === user.current_room_id)?.name || 'None';
        const password = user.password || '(Password not available - contact admin)';
        const text = `*D Telecom Login Details*\n\n*Username:* ${user.username}\n*Password:* ${password}\n*Assigned Room:* ${roomName}\n\nPlease login using the app.`;
        const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Users Management</h2>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
                >
                    + Add User
                </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard title="Total Users" value={stats.total} icon={UsersIcon} color="blue" />
                <StatsCard title="Active Users" value={stats.active} icon={UserCheck} color="green" />
                <StatsCard title="Disabled Users" value={stats.disabled} icon={UserX} color="red" />
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-600 min-w-[700px]">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Sr. No</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Username</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">WhatsApp Share</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Assigned Room</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Platform</th>
                                <th className="px-3 sm:px-6 py-3 text-right font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {users.map((user, index) => (
                                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 sm:px-6 py-4 text-gray-500">{index + 1}</td>
                                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900">{user.username}</td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <button
                                            onClick={() => shareExistingUser(user)}
                                            className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm font-medium"
                                        >
                                            <Share2 size={16} />
                                            <span className="hidden sm:inline">Share</span>
                                        </button>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        {user.current_room_id ? (
                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium">
                                                {rooms.find(r => r.id === user.current_room_id)?.name || 'Unknown'}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                                                Unassigned
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-3 sm:px-6 py-4">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <Smartphone size={16} />
                                            <span className="text-sm">{user.device_name || 'Unknown'}</span>
                                        </div>
                                    </td>
                                    <td className="px-3 sm:px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1 sm:gap-2">
                                            {/* Device Lock 'C' Button */}
                                            <button
                                                onClick={() => toggleDeviceLock(user)}
                                                title={user.device_lock ? "Device Locked (Click to Unlock)" : "Device Unlocked (Click to Lock)"}
                                                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-sm transition-colors ${user.device_lock ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                            >
                                                C
                                            </button>

                                            {/* Logout 'L' Button */}
                                            <button
                                                onClick={() => logoutUser(user.id, user.username)}
                                                title="Logout User"
                                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-white text-xs sm:text-sm bg-orange-500 hover:bg-orange-600 transition-colors"
                                            >
                                                L
                                            </button>

                                            <button onClick={() => handleEditUser(user)} title="Edit" className="p-1 hover:text-blue-500 text-gray-400 transition-colors">
                                                <Edit size={16} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                            <button onClick={() => deleteUser(user.id)} title="Delete" className="p-1 hover:text-red-600 text-gray-400 transition-colors">
                                                <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Add User Modal */}
            <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingUserId(null); }} title={editingUserId ? "Edit User" : "Add New User"}>
                <form onSubmit={handleAddUser} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                        <input
                            required
                            type="text"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password {editingUserId && '(Leave blank to keep current)'}</label>
                        <input
                            required={!editingUserId}
                            type="password"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                        <select
                            required
                            value={formData.role}
                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="user">User</option>
                            {/* Only super_admin can create admins */}
                            {currentAdmin?.isSuperAdmin && (
                                <>
                                    <option value="admin">Admin</option>
                                    <option value="super_admin">Super Admin</option>
                                </>
                            )}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assign Room *</label>
                        <select
                            required
                            value={formData.room_id}
                            onChange={e => setFormData({ ...formData, room_id: e.target.value })}
                            className={`w-full bg-white border rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all ${!formData.room_id ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                        >
                            <option value="">-- Select a Room (Required) --</option>
                            {rooms.map(room => (
                                <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                        </select>
                        {!formData.room_id && (
                            <p className="mt-1 text-xs text-red-500">Room assignment is required for all users</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                        <textarea
                            value={formData.notes}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            rows={3}
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded transition-colors"
                    >
                        {editingUserId ? 'Update User' : 'Create User'}
                    </button>
                </form>
            </Modal>

            {/* Success Modal for Newly Created User */}
            {newlyCreatedUser && (
                <Modal isOpen={true} onClose={() => setNewlyCreatedUser(null)} title="User Created Successfully! 🎉">
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <p className="text-green-800 font-medium mb-3">User credentials:</p>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Username:</span>
                                    <span className="font-mono font-bold text-gray-900">{newlyCreatedUser.username}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Password:</span>
                                    <span className="font-mono font-bold text-gray-900">{newlyCreatedUser.password}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600">Room:</span>
                                    <span className="font-bold text-gray-900">{newlyCreatedUser.roomName}</span>
                                </div>
                            </div>
                        </div>
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ <strong>Important:</strong> Save these credentials now! The password won't be shown again.
                            </p>
                        </div>
                        <button
                            onClick={() => {
                                shareOnWhatsApp(newlyCreatedUser.username, newlyCreatedUser.password, newlyCreatedUser.roomName);
                                setNewlyCreatedUser(null);
                            }}
                            className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors"
                        >
                            <Share2 size={20} />
                            Share on WhatsApp
                        </button>
                        <button
                            onClick={() => setNewlyCreatedUser(null)}
                            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 rounded-lg transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};
