import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Video, Download, Play, Search } from 'lucide-react';

interface Recording {
    id: string;
    room_id: number | null;
    room_name: string | null;
    file_url: string | null;
    started_at: string;
    ended_at: string | null;
    duration: number | null;
    created_by: string | null;
    recording_type: string | null;
}

export const Recordings: React.FC = () => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [filters, setFilters] = useState({ room: '', startDate: '', endDate: '' });

    useEffect(() => {
        fetchRecordings();
    }, []);

    const fetchRecordings = async () => {
        let query = supabase.from('recordings').select('*').order('started_at', { ascending: false });

        if (filters.startDate) query = query.gte('started_at', filters.startDate);
        if (filters.endDate) query = query.lte('started_at', filters.endDate);
        // Room filter would require join or separate logic if room name is needed, for now filtering by ID if provided
        if (filters.room) query = query.eq('room_id', parseInt(filters.room));

        const { data, error } = await query;
        if (data) setRecordings(data);
        if (error) console.error(error);
    };

    const formatDuration = (seconds: number | null, startedAt?: string, endedAt?: string) => {
        // If duration is null but we have timestamps, calculate it
        if (seconds === null || seconds === undefined) {
            if (startedAt && endedAt) {
                const start = new Date(startedAt).getTime();
                const end = new Date(endedAt).getTime();
                seconds = Math.floor((end - start) / 1000);
            } else {
                return '-';
            }
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-8">Recordings</h2>

            {/* Filters */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm mb-8 flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Room ID</label>
                    <input
                        type="number"
                        value={filters.room}
                        onChange={e => setFilters({ ...filters, room: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Filter by Room ID"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={filters.startDate}
                        onChange={e => setFilters({ ...filters, startDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                    <input
                        type="date"
                        value={filters.endDate}
                        onChange={e => setFilters({ ...filters, endDate: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-300 rounded-lg p-2.5 text-gray-900 outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    onClick={fetchRecordings}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-sm"
                >
                    <Search size={18} /> Filter
                </button>
            </div>

            {/* List */}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-gray-600">
                    <thead className="bg-gray-50 text-gray-500 uppercase text-xs border-b border-gray-200">
                        <tr>
                            <th className="px-6 py-3 font-semibold">Timestamp</th>
                            <th className="px-6 py-3 font-semibold">Room ID</th>
                            <th className="px-6 py-3 font-semibold">Duration</th>
                            <th className="px-6 py-3 font-semibold">Participants</th>
                            <th className="px-6 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {recordings.map(rec => (
                            <tr key={rec.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-900">{new Date(rec.started_at).toLocaleString()}</td>
                                <td className="px-6 py-4">{rec.room_name || rec.room_id || '-'}</td>
                                <td className="px-6 py-4">{formatDuration(rec.duration, rec.started_at, rec.ended_at ?? undefined)}</td>
                                <td className="px-6 py-4">{rec.created_by || 'Unknown'}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                    <a href={rec.file_url ?? '#'} target="_blank" rel="noreferrer" className={`p-2 rounded transition-colors ${rec.file_url ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                        <Play size={16} />
                                    </a>
                                    <a href={rec.file_url ?? '#'} download className={`p-2 rounded transition-colors ${rec.file_url ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                                        <Download size={16} />
                                    </a>
                                </td>
                            </tr>
                        ))}
                        {recordings.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                                    <Video size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No recordings found.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
