import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { walletService } from '../../wallet/walletService';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../api';

export default function AdminLoginPage() {
    const [walletAddress, setWalletAddress] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [walletVerified, setWalletVerified] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login } = useAuth();

    // Step 1: Connect MetaMask wallet
    const handleConnectWallet = async () => {
        setError('');
        setLoading(true);
        try {
            const address = await walletService.connectWallet();
            setWalletAddress(address);
            setIsConnected(true);

            // Step 2: Verify wallet is the admin wallet
            const result = await authAPI.verifyAdminWallet(address);
            if (result.allowed) {
                setWalletVerified(true);
            } else {
                setError('This wallet is not authorized as admin');
            }
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Wallet verification failed');
            setIsConnected(false);
        } finally {
            setLoading(false);
        }
    };

    // Step 3: Email/password login (second verification)
    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);

            if (user.role === 'ADMIN') {
                navigate('/admin/dashboard');
            } else {
                setError('Not authorized as admin');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid credentials');
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
                    <p className="text-gray-600 mt-2">
                        {!isConnected
                            ? 'Step 1: Connect your admin wallet'
                            : !walletVerified
                                ? 'Verifying wallet...'
                                : 'Step 2: Enter your credentials'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Step 1: Connect Wallet */}
                {!isConnected && (
                    <button
                        onClick={handleConnectWallet}
                        disabled={loading}
                        className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 text-lg font-medium"
                    >
                        {loading ? 'Connecting...' : 'Connect MetaMask'}
                    </button>
                )}

                {/* Wallet connected but NOT verified */}
                {isConnected && !walletVerified && !error && (
                    <div className="text-center text-gray-500">
                        <p>Verifying wallet...</p>
                    </div>
                )}

                {/* Wallet connected but FAILED verification */}
                {isConnected && !walletVerified && error && (
                    <div className="space-y-4">
                        <div className="bg-red-50 border border-red-200 p-4 rounded">
                            <p className="text-sm text-gray-600 mb-1">Connected Wallet:</p>
                            <p className="font-mono text-sm break-all">{walletAddress}</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsConnected(false);
                                setWalletAddress('');
                                setError('');
                            }}
                            className="w-full bg-gray-600 text-white py-3 px-4 rounded-md hover:bg-gray-700 text-lg font-medium"
                        >
                            Try Different Wallet
                        </button>
                    </div>
                )}

                {/* Step 2: Email/Password form (only shown after wallet is verified) */}
                {walletVerified && (
                    <div className="space-y-4">
                        <div className="bg-green-50 border border-green-200 p-4 rounded">
                            <p className="text-sm text-green-700 font-medium">✅ Wallet verified</p>
                            <p className="font-mono text-xs break-all text-gray-500 mt-1">{walletAddress}</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="admin@certify.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 text-lg font-medium"
                            >
                                {loading ? 'Logging in...' : 'Login as Admin'}
                            </button>
                        </form>
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
