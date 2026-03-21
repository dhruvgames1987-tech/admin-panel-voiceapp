import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCurrentAdmin } from '../lib/useCurrentAdmin';
import { Megaphone, Trash2, AlertCircle } from 'lucide-react';
import { Modal } from '../components/Modal';

interface Announcement {
    id: string;
    text: string;
    target_role: string;
    target_id: string | null;
    created_by: string;
    is_active: boolean;
    created_at: string;
}

interface User {
    id: string;
    username: string;
    full_name: string;
}

export const Announcements: React.FC = () => {
    const currentAdmin = getCurrentAdmin();
    const isSuperAdmin = currentAdmin?.isSuperAdmin;
    const targetRoleLabel = isSuperAdmin ? 'Admins' : 'Users';
    const dbTargetRole = isSuperAdmin ? 'admin' : 'user';

    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [targetUsers, setTargetUsers] = useState<User[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Form state
    const [text, setText] = useState('');
    const [targetId, setTargetId] = useState<string>('all'); // 'all' or specific user UUID

    useEffect(() => {
        fetchAnnouncements();
        fetchTargetUsers();
    }, []);

    const fetchAnnouncements = async () => {
        let query = supabase
            .from('announcements')
            .select('*')
            .eq('target_role', dbTargetRole)  // Super admin only sees admin-targeted, admins only see user-targeted
            .order('created_at', { ascending: false });

        if (!isSuperAdmin) {
            // Regular admin only sees their own announcements
            query = query.eq('created_by', currentAdmin?.id);
        } else {
            // Super admin only sees announcements THEY created (for admins)
            query = query.eq('created_by', currentAdmin?.id);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching announcements:', error);
        } else if (data) {
            setAnnouncements(data);
        }
    };


    const fetchTargetUsers = async () => {
        let query = supabase
            .from('users')
            .select('id, username, full_name')
            .eq('role', dbTargetRole);

        if (!isSuperAdmin) {
            query = query.eq('created_by', currentAdmin?.id);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching target users:', error);
        } else if (data) {
            setTargetUsers(data);
        }
    };

    const handleCreateAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!text.trim()) {
            alert('Headline text is required.');
            return;
        }

        const payload = {
            text: text.trim(),
            target_role: dbTargetRole,
            target_id: targetId === 'all' ? null : targetId,
            created_by: currentAdmin?.id,
            is_active: true
        };

        const { error } = await supabase.from('announcements').insert([payload]);

        if (error) {
            alert('Error creating announcement: ' + error.message);
        } else {
            alert('Announcement created successfully!');
            setIsModalOpen(false);
            setText('');
            setTargetId('all');
            fetchAnnouncements();
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this announcement?')) return;

        const { error } = await supabase.from('announcements').delete().eq('id', id);
        if (error) {
            alert('Error deleting announcement: ' + error.message);
        } else {
            fetchAnnouncements();
        }
    };

    const handleToggleActive = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase
            .from('announcements')
            .update({ is_active: !currentStatus })
            .eq('id', id);

        if (error) {
            alert('Error updating status: ' + error.message);
        } else {
            fetchAnnouncements();
        }
    };

    const getTargetName = (id: string | null) => {
        if (!id) return `All ${targetRoleLabel}`;
        const user = targetUsers.find(u => u.id === id);
        return user ? user.username : 'Unknown';
    };

    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 sm:mb-8">
                <div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Announcements / Headlines</h2>
                    <p className="text-gray-500 mt-1 flex items-center gap-1">
                        <AlertCircle size={14} />
                        Broadcast text headlines to mobile apps
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md flex items-center justify-center gap-2"
                >
                    <Megaphone size={18} />
                    New Headline
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-gray-600 min-w-[700px]">
                        <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
                            <tr>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Status</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Headline Text</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Target</th>
                                <th className="px-3 sm:px-6 py-3 font-semibold">Created At</th>
                                <th className="px-3 sm:px-6 py-3 text-right font-semibold">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {announcements.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No announcements found. Click "New Headline" to start broadcasting.
                                    </td>
                                </tr>
                            ) : (
                                announcements.map((ann) => (
                                    <tr key={ann.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-3 sm:px-6 py-4">
                                            <button 
                                                onClick={() => handleToggleActive(ann.id, ann.is_active)}
                                                className={`px-3 py-1 text-xs font-bold rounded-full ${ann.is_active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                                            >
                                                {ann.is_active ? 'Active' : 'Inactive'}
                                            </button>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 font-medium text-gray-900 max-w-[300px] truncate">
                                            {ann.text}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-medium border border-blue-100">
                                                {getTargetName(ann.target_id)}
                                            </span>
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 text-sm text-gray-500">
                                            {new Date(ann.created_at).toLocaleString()}
                                        </td>
                                        <td className="px-3 sm:px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2">
                                                <button onClick={() => handleDelete(ann.id)} title="Delete" className="p-1.5 hover:bg-red-50 hover:text-red-600 rounded text-gray-400 transition-colors">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Create Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Broadcast New Headline">
                <form onSubmit={handleCreateAnnouncement} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Headline Text *</label>
                        <textarea
                            required
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Type the announcement that will scroll on user screens..."
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                            rows={3}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience *</label>
                        <select
                            required
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full bg-white border border-gray-300 rounded-lg p-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                        >
                            <option value="all">All {targetRoleLabel}</option>
                            {targetUsers.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || u.username} (@{u.username})</option>
                            ))}
                        </select>
                        <p className="mt-1 text-xs text-gray-500">
                            {targetId === 'all' 
                                ? `The headline will appear for all ${targetRoleLabel.toLowerCase()}.` 
                                : `The headline will only appear for the selected ${isSuperAdmin ? 'admin' : 'user'}.`}
                        </p>
                    </div>

                    <div className="pt-2">
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                            <Megaphone size={18} />
                            Publish Headline
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};
