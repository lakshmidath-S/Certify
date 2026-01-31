import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { walletService } from '../../wallet/walletService';
import { useAuth } from '../../context/AuthContext';

export default function AdminLoginPage() {
    const [walletAddress, setWalletAddress] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    const handleConnectWallet = async () => {
        try {
            const address = await walletService.connectWallet();
            setWalletAddress(address);
            setIsConnected(true);
            setError('');
        } catch (err) {
            setError(err.message || 'Failed to connect wallet');
        }
    };

    const handleLogin = async () => {
        setError('');
        setLoading(true);

        try {
            const user = await login('admin@certify.com', 'admin123');

            if (user.role === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                setError('Not authorized as admin');
            }
        } catch (err) {
            setError('Admin login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center px-4">
            <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
                <div className="text-center mb-8">
                    <div className="text-6xl mb-4">👑</div>
                    <h1 className="text-3xl font-bold text-gray-900">Admin Login</h1>
                    <p className="text-gray-600 mt-2">Connect your admin wallet</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {!isConnected ? (
                    <button
                        onClick={handleConnectWallet}
                        className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 text-lg font-medium"
                    >
                        Connect MetaMask
                    </button>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 p-4 rounded">
                            <p className="text-sm text-gray-600 mb-1">Connected Wallet:</p>
                            <p className="font-mono text-sm break-all">{walletAddress}</p>
                        </div>

                        <button
                            onClick={handleLogin}
                            disabled={loading}
                            className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 text-lg font-medium"
                        >
                            {loading ? 'Logging in...' : 'Login as Admin'}
                        </button>
                    </div>
                )}

                <div className="mt-6 text-center">
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-purple-600 hover:text-purple-800"
                    >
                        ← Back to role selection
                    </button>
                </div>
            </div>
        </div>
    );
}
