import React, { useEffect, useState, useRef } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ControlBar, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { generateToken, startSessionRecording, stopSessionRecording } from '../lib/api';
import { X, RefreshCw, AlertCircle, Circle, Square } from 'lucide-react';

interface AudioControllerProps {
    roomName: string;
    username: string;
    onClose: () => void;
}

type ConnectionState = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'FAILED';

// Retry configuration
const MAX_RETRY_BEFORE_PROMPT = 10; // Show manual retry after 10 attempts
const getRetryDelay = (attempt: number): number => {
    if (attempt === 0) return 0; // Immediate first retry
    const baseDelay = Math.min(1000 * Math.pow(2, attempt - 1), 30000); // Cap at 30s
    const jitter = Math.random() * 1000; // 0-1s random jitter
    return baseDelay + jitter;
};

const InnerController = ({
    onClose,
    connectionState,
    retryCount,
    onRetry,
    roomName,
    username
}: {
    onClose: () => void;
    connectionState: ConnectionState;
    retryCount: number;
    onRetry: () => void;
    roomName: string;
    username: string;
}) => {
    const { isMicrophoneEnabled } = useLocalParticipant();
    const [isRecording, setIsRecording] = useState(false);
    const [egressId, setEgressId] = useState<string | null>(null);
    const [recordingError, setRecordingError] = useState<string | null>(null);

    const handleStartRecording = async () => {
        try {
            setRecordingError(null);
            const result = await startSessionRecording(roomName, username);
            if (result?.egressId) {
                setEgressId(result.egressId);
                setIsRecording(true);
            }
        } catch (error: any) {
            console.error('Failed to start recording:', error);
            setRecordingError(error?.message || 'Failed to start recording');
        }
    };

    const handleStopRecording = async () => {
        if (!egressId) return;

        try {
            setRecordingError(null);
            await stopSessionRecording(egressId);
            setIsRecording(false);
            setEgressId(null);
        } catch (error: any) {
            console.error('Failed to stop recording:', error);
            setRecordingError(error?.message || 'Failed to stop recording');
        }
    };

    return (
        <>
            {/* Connection Status Banner (shown when reconnecting or failed) */}
            {(connectionState === 'RECONNECTING' || connectionState === 'FAILED') && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className={`px-4 py-3 rounded-lg shadow-xl border ${connectionState === 'FAILED'
                        ? 'bg-red-900 border-red-700'
                        : 'bg-yellow-900 border-yellow-700'
                        } flex items-center gap-3`}>
                        {connectionState === 'RECONNECTING' ? (
                            <>
                                <RefreshCw size={18} className="text-yellow-300 animate-spin" />
                                <span className="text-yellow-100 font-medium">
                                    Reconnecting... (Attempt {retryCount})
                                </span>
                            </>
                        ) : (
                            <>
                                <AlertCircle size={18} className="text-red-300" />
                                <span className="text-red-100 font-medium">
                                    Connection failed after {retryCount} attempts
                                </span>
                                <button
                                    onClick={onRetry}
                                    className="ml-2 px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm font-medium transition-colors"
                                >
                                    Try Again
                                </button>
                                <button
                                    onClick={onClose}
                                    className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Recording Error Banner */}
            {recordingError && (
                <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
                    <div className="px-4 py-3 rounded-lg shadow-xl border bg-red-900 border-red-700 flex items-center gap-3">
                        <AlertCircle size={18} className="text-red-300" />
                        <span className="text-red-100 font-medium">{recordingError}</span>
                        <button
                            onClick={() => setRecordingError(null)}
                            className="px-2 py-1 bg-red-700 hover:bg-red-600 text-white rounded text-sm"
                        >
                            Dismiss
                        </button>
                    </div>
                </div>
            )}

            {/* Main Broadcasting Controls */}
            <div className="fixed bottom-4 right-4 bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700 flex items-center gap-4 z-50">
                <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${connectionState === 'CONNECTED' && isMicrophoneEnabled
                        ? 'bg-green-500 animate-pulse'
                        : connectionState === 'CONNECTED'
                            ? 'bg-red-500'
                            : 'bg-yellow-500 animate-pulse'
                        }`} />
                    <span className="text-white font-medium">
                        {connectionState === 'CONNECTED' ? 'Broadcasting' : 'Connecting...'}
                    </span>
                </div>

                {connectionState === 'CONNECTED' && (
                    <>
                        <ControlBar controls={{ microphone: true, camera: false, screenShare: false, chat: false, leave: false }} />

                        {/* Session Recording Toggle */}
                        <button
                            onClick={isRecording ? handleStopRecording : handleStartRecording}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isRecording
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                }`}
                            title={isRecording ? 'Stop Recording' : 'Start Recording'}
                        >
                            {isRecording ? (
                                <>
                                    <Square size={16} fill="white" />
                                    <span className="text-sm font-medium">Stop Rec</span>
                                </>
                            ) : (
                                <>
                                    <Circle size={16} className="text-red-400" />
                                    <span className="text-sm font-medium">Record</span>
                                </>
                            )}
                        </button>
                    </>
                )}

                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
                    <X size={20} />
                </button>
            </div>
        </>
    );
};

export const AudioController: React.FC<AudioControllerProps> = ({ roomName, username, onClose }) => {
    const [token, setToken] = useState('');
    const [connectionState, setConnectionState] = useState<ConnectionState>('CONNECTING');
    const [retryCount, setRetryCount] = useState(0);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isComponentMounted = useRef(true);

    // Self-Hosted LiveKit Server
    const url = 'wss://meet.dhruvmusic.co.in';

    // Generate unique username to prevent duplicate connections
    const uniqueUsername = useRef(`${username}-${Date.now()}`);

    const connectWithRetry = async (attempt: number) => {
        if (!isComponentMounted.current) return;

        try {
            console.log(`[AudioController] Connection attempt ${attempt + 1}...`);
            setConnectionState(attempt === 0 ? 'CONNECTING' : 'RECONNECTING');
            setRetryCount(attempt + 1);

            const t = await generateToken(uniqueUsername.current, roomName);

            if (!isComponentMounted.current) return;

            setToken(t);
            setConnectionState('CONNECTED');
            setRetryCount(0);
            console.log('[AudioController] Successfully connected');
        } catch (error) {
            console.error(`[AudioController] Connection attempt ${attempt + 1} failed:`, error);

            if (!isComponentMounted.current) return;

            // Check if we should show the "give up" option
            if (attempt >= MAX_RETRY_BEFORE_PROMPT) {
                setConnectionState('FAILED');
                // Don't auto-retry, wait for user to click "Try Again"
            } else {
                // Schedule next retry with exponential backoff
                const delay = getRetryDelay(attempt);
                console.log(`[AudioController] Retrying in ${Math.round(delay)}ms...`);

                retryTimeoutRef.current = setTimeout(() => {
                    connectWithRetry(attempt + 1);
                }, delay);
            }
        }
    };

    const handleManualRetry = () => {
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }
        // Reset counter and start fresh
        setRetryCount(0);
        setConnectionState('CONNECTING');
        connectWithRetry(0);
    };

    useEffect(() => {
        isComponentMounted.current = true;
        connectWithRetry(0);

        return () => {
            isComponentMounted.current = false;
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomName]); // Only re-run if room changes (connectWithRetry is stable)

    // Show loading state while waiting for initial token
    if (!token) {
        return (
            <div className="fixed bottom-4 right-4 bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700 flex items-center gap-4 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                    <span className="text-white font-medium">Connecting...</span>
                </div>
                {connectionState === 'FAILED' ? (
                    <div className="flex gap-2">
                        <button
                            onClick={handleManualRetry}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-medium transition-colors"
                        >
                            Try Again
                        </button>
                        <button
                            onClick={onClose}
                            className="px-3 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                ) : (
                    <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
                        <X size={20} />
                    </button>
                )}
            </div>
        );
    }

    return (
        <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={url}
            connect={true}
            data-lk-theme="default"
            options={{
                // Production-ready reconnection policy
                reconnectPolicy: {
                    nextRetryDelayInMs: (context) => {
                        // Infinite retries with smart backoff
                        const baseDelay = Math.min(1000 * Math.pow(2, context.retryCount), 30000);
                        const jitter = Math.random() * 1000;
                        return baseDelay + jitter;
                    },
                },
            }}
            onConnected={() => {
                console.log('[AudioController] LiveKit room connected');
                setConnectionState('CONNECTED');
            }}
            onDisconnected={() => {
                console.log('[AudioController] LiveKit room disconnected');
                setConnectionState('RECONNECTING');
            }}
        >
            <InnerController
                onClose={onClose}
                connectionState={connectionState}
                retryCount={retryCount}
                onRetry={handleManualRetry}
                roomName={roomName}
                username={username}
            />
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
};
