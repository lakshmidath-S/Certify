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
        <div className="min-h-screen text-white font-sans flex items-center justify-center px-4 overflow-hidden selection:bg-white/30">
            {/* Background elements handled via index.css globally */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-white/[0.02] rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-md w-full bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-md p-10 animate-fade-in-up">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="mb-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        <ShieldCheck className="w-6 h-6 text-white stroke-[1.5]" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">Admin Login</h1>
                    <p className="text-[#A1A1A1] mt-3 font-normal">
                        {!isConnected
                            ? 'Step 1: Connect your admin wallet'
                            : !walletVerified
                                ? 'Verifying wallet...'
                                : 'Step 2: Enter your credentials'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm mb-6">
                        {error}
                    </div>
                )}

                {/* Step 1: Connect Wallet */}
                {!isConnected && (
                    <button
                        onClick={handleConnectWallet}
                        disabled={loading}
                        className="w-full rounded-full bg-white px-6 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                        {loading ? 'Connecting...' : 'Connect MetaMask'}
                    </button>
                )}

                {/* Wallet connected but NOT verified */}
                {isConnected && !walletVerified && !error && (
                    <div className="text-center text-[#A1A1A1]">
                        <p className="animate-pulse">Verifying wallet signature...</p>
                    </div>
                )}

                {/* Wallet connected but FAILED verification */}
                {isConnected && !walletVerified && error && (
                    <div className="space-y-6">
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl text-center">
                            <p className="text-xs text-[#A1A1A1] mb-1">Connected Wallet:</p>
                            <p className="font-mono text-sm text-red-300 break-all">{walletAddress}</p>
                        </div>
                        <button
                            onClick={() => {
                                setIsConnected(false);
                                setWalletAddress('');
                                setError('');
                            }}
                            className="w-full rounded-full bg-[#111111] border border-white/[0.08] px-6 py-3.5 text-white font-semibold transition-transform hover:bg-[#1A1A1A] hover:scale-105 active:scale-95 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
                        >
                            Try Different Wallet
                        </button>
                    </div>
                )}

                {/* Step 2: Email/Password form (only shown after wallet is verified) */}
                {walletVerified && (
                    <div className="space-y-6">
                        <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl text-center">
                            <p className="text-sm text-emerald-400 font-medium tracking-tight">Wallet verified securely</p>
                            <p className="font-mono text-xs text-[#A1A1A1] break-all mt-2">{walletAddress}</p>
                        </div>

                        <form onSubmit={handleLogin} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Email</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                                    placeholder="admin@certify.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Password</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full rounded-full bg-white px-6 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)] mt-2"
                            >
                                {loading ? 'Logging in...' : 'Login as Admin'}
                            </button>
                        </form>
                    </div>
                )}

                <div className="mt-8 text-center space-y-4 pt-6 border-t border-white/[0.08]">
                    <button
                        onClick={() => navigate('/')}
                        className="text-sm text-[#A1A1A1] hover:text-white transition-colors flex items-center justify-center w-full"
                    >
                        <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to role selection
                    </button>
                </div>
            </div>
        </div>
    );
}
