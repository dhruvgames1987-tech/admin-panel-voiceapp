import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';

export const api = axios.create({
    baseURL: API_URL,
});

export const generateToken = async (username: string, roomName: string) => {
    const response = await api.post('/token', { username, roomName });
    return response.data.token;
};

export const muteAllParticipants = async (roomName: string) => {
    const response = await api.post('/mute-all', { roomName });
    return response.data;
};

export const unmuteAllParticipants = async (roomName: string) => {
    const response = await api.post('/unmute-all', { roomName });
    return response.data;
};

export const logoutAllParticipants = async (roomName: string) => {
    const response = await api.post('/logout-all', { roomName });
    return response.data;
};

export const logoutUser = async (roomName: string, identity: string) => {
    const response = await api.post('/logout-user', { roomName, identity });
    return response.data;
};

// Session recording API functions
export const startSessionRecording = async (roomName: string, username: string) => {
    const response = await api.post('/start-session-recording', { roomName, username });
    return response.data;
};

export const stopSessionRecording = async (egressId: string) => {
    const response = await api.post('/stop-session-recording', { egressId });
    return response.data;
};

export const getSessionRecordings = async (roomName?: string) => {
    const params = roomName ? { roomName } : {};
    const response = await api.get('/session-recordings', { params });
    return response.data;
};

