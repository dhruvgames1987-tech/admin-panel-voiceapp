import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { API_URL } from '../lib/api';
import { Video, Download, Play, Pause, Search, RefreshCw, AlertCircle, Loader2, CheckCircle, Clock } from 'lucide-react';

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
    status: string | null;
    egress_id: string | null;
}

export const Recordings: React.FC = () => {
    const [recordings, setRecordings] = useState<Recording[]>([]);
    const [filters, setFilters] = useState({ room: '', startDate: '', endDate: '' });
    const [playingId, setPlayingId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        fetchRecordings(true);

        // Auto-refresh every 30 seconds for recordings that may still be processing
        pollIntervalRef.current = setInterval(() => {
            fetchRecordings(false);
        }, 30000);

        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
                pollIntervalRef.current = null;
            }
        };
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

    const fetchRecordings = async (showLoader = true) => {
        if (showLoader) setLoading(true);
        setError(null);

        try {
            let query = supabase
                .from('recordings')
                .select('*')
                .order('started_at', { ascending: false });

            if (filters.startDate) query = query.gte('started_at', filters.startDate);
            if (filters.endDate) query = query.lte('started_at', filters.endDate);
            if (filters.room) query = query.eq('room_id', parseInt(filters.room));

            const { data, error: queryError } = await query;

            if (queryError) {
                console.error('Supabase query error:', queryError);
                setError(`Failed to load recordings: ${queryError.message}`);
                return;
            }

            setRecordings(data || []);
        } catch (err: any) {
            console.error('Fetch recordings error:', err);
            setError(err?.message || 'Failed to load recordings. Please try again.');
        } finally {
            if (showLoader) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRecordings(false);
        setRefreshing(false);
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

    // Build full URL for a recording file
    const getFullFileUrl = (fileUrl: string) => {
        // If already absolute URL, use as-is
        if (fileUrl.startsWith('http')) return fileUrl;
        // Prepend backend URL to the relative path
        return `${API_URL}${fileUrl}`;
    };

    const handlePlay = (rec: Recording) => {
        if (!rec.file_url || rec.status === 'recording') {
            if (rec.status === 'recording') {
                alert('This recording is still being processed. Please wait.');
            } else {
                alert('No audio file available for this recording.');
            }
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
        const fullUrl = getFullFileUrl(rec.file_url);
        const audio = new Audio(fullUrl);
        audio.onended = () => setPlayingId(null);
        audio.onerror = () => {
            console.error('Audio playback error for recording:', rec.id);
            alert('Failed to play this recording. The audio file may have been removed or is unavailable.');
            setPlayingId(null);
        };
        audio.play().catch((err) => {
            console.error('Audio play() error:', err);
            alert('Failed to play this recording. The file may be unavailable or the format is not supported.');
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
        if (rec.status === 'recording') {
            alert('This recording is still being processed. Please wait until it completes.');
            return;
        }
        const a = document.createElement('a');
        a.href = getFullFileUrl(rec.file_url);
        a.download = `recording_${rec.room_name || rec.room_id || 'unknown'}_${new Date(rec.started_at).toISOString().slice(0, 10)}.ogg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const getStatusBadge = (rec: Recording) => {
        const status = rec.status || 'unknown';

        switch (status) {
            case 'completed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                        <CheckCircle size={12} /> Completed
                    </span>
                );
            case 'recording':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 animate-pulse">
                        <Clock size={12} /> Processing
                    </span>
                );
            case 'failed':
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                        <AlertCircle size={12} /> Failed
                    </span>
                );
            default:
                return (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {status}
                    </span>
                );
        }
    };

    const getTypeBadge = (rec: Recording) => {
        const type = rec.recording_type;
        if (type === 'user_clip') {
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">🎤 User Clip</span>;
        }
        if (type === 'admin_session') {
            return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">📹 Session</span>;
        }
        return null;
    };

    // Loading state
    if (loading) {
        return (
            <div>
                <h2 className="text-3xl font-bold text-gray-900 mb-8">Recordings</h2>
                <div className="flex items-center justify-center py-20">
                    <Loader2 size={32} className="animate-spin text-blue-600" />
                    <span className="ml-3 text-gray-500 text-lg">Loading recordings...</span>
                </div>
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold text-gray-900">Recordings</h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    title="Refresh recordings"
                >
                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                    Refresh
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
                    <p className="text-red-700 flex-1">{error}</p>
                    <button
                        onClick={() => fetchRecordings(true)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        Retry
                    </button>
                </div>
            )}

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
                    onClick={() => fetchRecordings(true)}
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
                            <th className="px-6 py-3 font-semibold">Type</th>
                            <th className="px-6 py-3 font-semibold">Status</th>
                            <th className="px-6 py-3 font-semibold">Duration</th>
                            <th className="px-6 py-3 font-semibold">Created By</th>
                            <th className="px-6 py-3 text-right font-semibold">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {recordings.map(rec => {
                            const isProcessing = rec.status === 'recording';
                            const isFailed = rec.status === 'failed';
                            const hasFile = !!rec.file_url && !isProcessing;

                            return (
                                <tr key={rec.id} className={`hover:bg-gray-50 transition-colors ${isProcessing ? 'bg-yellow-50/30' : ''} ${isFailed ? 'bg-red-50/30' : ''}`}>
                                    <td className="px-6 py-4 font-medium text-gray-900">{new Date(rec.started_at).toLocaleString()}</td>
                                    <td className="px-6 py-4">{rec.room_name || rec.room_id || '-'}</td>
                                    <td className="px-6 py-4">{getTypeBadge(rec)}</td>
                                    <td className="px-6 py-4">{getStatusBadge(rec)}</td>
                                    <td className="px-6 py-4">{formatDuration(rec.duration, rec.started_at, rec.ended_at ?? undefined)}</td>
                                    <td className="px-6 py-4">{rec.created_by || 'Unknown'}</td>
                                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                                        <button
                                            onClick={() => handlePlay(rec)}
                                            disabled={!hasFile}
                                            className={`p-2 rounded transition-colors ${hasFile
                                                ? playingId === rec.id
                                                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            title={isProcessing ? 'Still processing...' : playingId === rec.id ? 'Pause' : 'Play'}
                                        >
                                            {playingId === rec.id ? <Pause size={16} /> : <Play size={16} />}
                                        </button>
                                        <button
                                            onClick={() => handleDownload(rec)}
                                            disabled={!hasFile}
                                            className={`p-2 rounded transition-colors ${hasFile
                                                ? 'bg-green-50 text-green-600 hover:bg-green-100'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                }`}
                                            title={isProcessing ? 'Still processing...' : 'Download'}
                                        >
                                            <Download size={16} />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {recordings.length === 0 && (
                            <tr>
                                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                                    <Video size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>No recordings found.</p>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Summary */}
            {recordings.length > 0 && (
                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                    <p>
                        Showing {recordings.length} recording{recordings.length !== 1 ? 's' : ''}
                        {recordings.filter(r => r.status === 'recording').length > 0 && (
                            <span className="ml-2 text-yellow-600">
                                ({recordings.filter(r => r.status === 'recording').length} still processing)
                            </span>
                        )}
                    </p>
                    <p className="text-gray-400">Auto-refreshes every 30s</p>
                </div>
            )}
        </div>
    );
};
