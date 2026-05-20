import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronLeft } from 'lucide-react';
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
        <div className="min-h-screen text-slate-800 font-sans flex items-center justify-center px-4 overflow-hidden selection:bg-blue-600/30">
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 max-w-md w-full bg-white rounded-[28px] border-2 border-violet-400 shadow-[0_8px_32px_rgb(124,58,237,0.18)] p-10 animate-fade-in-up">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="mb-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-violet-50 border border-violet-200 shadow-sm text-violet-600">
                        <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Admin Login</h1>
                    <p className="text-slate-500 mt-3 font-normal">
                        {!isConnected
                            ? 'Step 1: Connect your admin wallet'
                            : !walletVerified
                                ? 'Verifying wallet...'
                                : 'Step 2: Enter your credentials'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Step 1: Connect Wallet */}
                {!isConnected && (
                    <button
                        onClick={handleConnectWallet}
                        disabled={loading}
                        className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                    >
                        {loading ? 'Connecting...' : 'Connect MetaMask'}
                    </button>
                )}

                {/* Wallet connected but NOT verified */}
                {isConnected && !walletVerified && !error && (
                    <div className="text-center text-slate-500">
                        <p className="animate-pulse">Verifying wallet signature...</p>
                    </div>
                )}

                {/* Wallet connected but FAILED verification */}
                {isConnected && !walletVerified && error && (
                    <div className="space-y-6">
                        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-center">
                            <p className="text-xs text-slate-500 mb-1">Connected Wallet:</p>
                            <p className="font-mono text-sm text-red-500 break-all">{walletAddress}</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsConnected(false);
                                setWalletAddress('');
                                setError('');
                            }}
                            className="w-full rounded-full bg-slate-100 border border-slate-200 px-6 py-3.5 text-slate-700 font-semibold transition-transform hover:bg-slate-200 hover:scale-105 active:scale-95"
                        >
                            Try Different Wallet
                        </button>
                    </div>
                )}

                {/* Step 2: Email/Password form (only shown after wallet is verified) */}
                {walletVerified && (
                    <div className="space-y-6">
                        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
                            <p className="text-sm text-emerald-600 font-medium tracking-tight">Wallet verified securely</p>
                            <p className="font-mono text-xs text-slate-500 break-all mt-2">{walletAddress}</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                    placeholder="admin@certify.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)] mt-2"
                            >
                                {loading ? 'Logging in...' : 'Login as Admin'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-8 text-center space-y-4 pt-6 border-t border-blue-50">
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center w-full"
                    >
                        <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to role selection
                    </button>
                </div>
            </div>
        </div>
    );
}
