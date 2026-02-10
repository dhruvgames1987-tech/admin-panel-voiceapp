import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Video, Download, Play, Pause, Search } from 'lucide-react';

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
    const [playingId, setPlayingId] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        fetchRecordings();
    }, []);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const fetchRecordings = async () => {
        let query = supabase.from('recordings').select('*').order('started_at', { ascending: false });

        if (filters.startDate) query = query.gte('started_at', filters.startDate);
        if (filters.endDate) query = query.lte('started_at', filters.endDate);
        if (filters.room) query = query.eq('room_id', parseInt(filters.room));

        const { data, error } = await query;
        if (data) setRecordings(data);
        if (error) console.error(error);
    };

    const formatDuration = (seconds: number | null, startedAt?: string, endedAt?: string) => {
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

    const handlePlay = (rec: Recording) => {
        if (!rec.file_url) {
            alert('No audio file available for this recording.');
            return;
        }

        // If already playing this recording, pause it
        if (playingId === rec.id && audioRef.current) {
            audioRef.current.pause();
            setPlayingId(null);
            return;
        }

        // Stop any currently playing audio
        if (audioRef.current) {
            audioRef.current.pause();
        }

        // Create new audio and play
        const audio = new Audio(rec.file_url);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
            alert('Failed to play this recording. The file may be unavailable.');
            setPlayingId(null);
        };
        audio.play().catch(() => {
            alert('Failed to play this recording.');
            setPlayingId(null);
        });
        audioRef.current = audio;
        setPlayingId(rec.id);
    };

    const handleDownload = (rec: Recording) => {
        if (!rec.file_url) {
            alert('No audio file available for download.');
            return;
        }
        const a = document.createElement('a');
        a.href = rec.file_url;
        a.download = `recording_${rec.room_name || rec.room_id || 'unknown'}_${new Date(rec.started_at).toISOString().slice(0, 10)}.ogg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
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
                            <th className="px-6 py-3 font-semibold">Room</th>
                            <th className="px-6 py-3 font-semibold">Duration</th>
                            <th className="px-6 py-3 font-semibold">Created By</th>
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
                                    <button
                                        onClick={() => handlePlay(rec)}
                                        className={`p-2 rounded transition-colors ${rec.file_url
                                                ? playingId === rec.id
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        title={playingId === rec.id ? 'Pause' : 'Play'}
                                    >
                                        {playingId === rec.id ? <Pause size={16} /> : <Play size={16} />}
                                    </button>
                                    <button
                                        onClick={() => handleDownload(rec)}
                                        className={`p-2 rounded transition-colors ${rec.file_url
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                        title="Download"
                                    >
                                        <Download size={16} />
                                    </button>
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
