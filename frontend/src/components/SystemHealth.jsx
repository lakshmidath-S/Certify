import React, { useEffect, useState } from 'react';
import { healthAPI } from '../api';

const SystemHealth = () => {
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkHealth = async () => {
        try {
            const data = await healthAPI.check();
            setHealth(data);
        } catch (error) {
            setHealth({ success: false });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        checkHealth();
        const interval = setInterval(checkHealth, 5000); // Poll every 5s for demo responsiveness
        return () => clearInterval(interval);
    }, []);

    if (loading) return <div className="text-xs text-gray-500">Checking system...</div>;

    if (!health || !health.success) {
        return (
            <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded shadow-lg flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                <span className="text-sm font-medium">System Offline</span>
            </div>
        );
    }

    return (
        <div className="fixed bottom-4 right-4 bg-white border border-gray-200 p-4 rounded-lg shadow-xl text-sm z-50">
            <h3 className="font-bold text-gray-700 mb-2 border-b pb-1">System Status</h3>
            <div className="space-y-2">
                <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-600">Database</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${health.database === 'CONNECTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {health.database}
                    </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-600">Blockchain</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${health.blockchain.startsWith('CONNECTED') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                        {health.blockchain.split(' ')[0]}
                    </span>
                </div>
                <div className="text-xs text-gray-400 mt-2 text-right">
                    {new Date(health.timestamp).toLocaleTimeString()}
                </div>
            </div>
        </div>
    );
};

export default SystemHealth;
