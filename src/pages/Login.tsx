import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('username', username)
                .in('role', ['admin', 'super_admin'])
                .single();

            if (error || !data) {
                setError('Invalid admin credentials');
                return;
            }

            // SECURITY: Verify password
            if (data.password !== password) {
                setError('Invalid admin credentials');
                return;
            }

            localStorage.setItem('dtelecom_admin', JSON.stringify(data));
            navigate('/dashboard');

        } catch (err) {
            setError('Login failed');
            console.error(err);
        }
    };

    return (
        <div className="min-h-screen flex w-full">
            {/* Left Side - Brand Color */}
            <div className="hidden lg:flex lg:w-1/2 bg-blue-700 flex-col justify-center items-center text-white p-12 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600 to-indigo-900 opacity-90"></div>
                <div className="relative z-10 text-center">
                    <h1 className="text-5xl font-bold mb-6">Dashboard Login</h1>
                    <p className="text-xl text-blue-100 max-w-md mx-auto">
                        Secure access to the D Telecom administration panel. Manage users, rooms, and recordings efficiently.
                    </p>
                </div>
                {/* Decorative Circle */}
                <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
            </div>

            {/* Right Side - Login Form */}
            <div className="w-full lg:w-1/2 bg-white flex flex-col justify-center items-center p-8">
                <div className="w-full max-w-md">
                    <div className="text-center mb-10">
                        <img src="/logo.png" alt="D Telecom Logo" className="h-24 mx-auto mb-4 object-contain" />
                        <h2 className="text-3xl font-bold text-gray-900">D Telecom</h2>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded shadow-sm" role="alert">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="Enter your username"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                            <div className="relative">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-4 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-gray-900 placeholder-gray-400"
                                    placeholder="Enter your password"
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-lg transition-all shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-0.5"
                        >
                            Login
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-gray-500">
                        &copy; {new Date().getFullYear()} D Telecom. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
};
