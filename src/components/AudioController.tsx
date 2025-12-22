import React, { useEffect, useState } from 'react';
import { LiveKitRoom, RoomAudioRenderer, ControlBar, useLocalParticipant } from '@livekit/components-react';
import '@livekit/components-styles';
import { generateToken } from '../lib/api';
import { X } from 'lucide-react';

interface AudioControllerProps {
    roomName: string;
    username: string;
    onClose: () => void;
}

const InnerController = ({ onClose }: { onClose: () => void }) => {
    const { isMicrophoneEnabled } = useLocalParticipant();

    return (
        <div className="fixed bottom-4 right-4 bg-gray-900 p-4 rounded-lg shadow-xl border border-gray-700 flex items-center gap-4 z-50">
            <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isMicrophoneEnabled ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                <span className="text-white font-medium">Broadcasting</span>
            </div>

            <ControlBar controls={{ microphone: true, camera: false, screenShare: false, chat: false, leave: false }} />

            <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white">
                <X size={20} />
            </button>
        </div>
    );
};

export const AudioController: React.FC<AudioControllerProps> = ({ roomName, username, onClose }) => {
    const [token, setToken] = useState('');
    // TODO: Replace with your NEW LiveKit URL
    const url = 'wss://nexmeet-i6jtqeez.livekit.cloud';

    useEffect(() => {
        const getToken = async () => {
            try {
                const t = await generateToken(username, roomName);
                setToken(t);
            } catch (e) {
                console.error(e);
                alert('Failed to connect to audio');
                onClose();
            }
        };
        getToken();
    }, [roomName, username]);

    if (!token) return null;

    return (
        <LiveKitRoom
            video={false}
            audio={true}
            token={token}
            serverUrl={url}
            connect={true}
            data-lk-theme="default"
        >
            <InnerController onClose={onClose} />
            <RoomAudioRenderer />
        </LiveKitRoom>
    );
};
