import { useState } from 'react';
import { useNavigate, Link, useLocation, useSearchParams } from 'react-router-dom';
import { BadgeCheck, GraduationCap, ShieldCheck, Lock, ArrowUpRight, ChevronLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role');

    const { login, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const successMessage = location.state?.message;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const user = await login(email, password);

            // Check if login role matches user's actual role
            if (role && user.role.toLowerCase() !== role.toLowerCase()) {
                // Not the right role, log out to clear the token and throw an error
                logout();
                throw new Error(`Unauthorized. Please login through the ${user.role} portal.`);
            }

            const roleRoutes = {
                ADMIN: '/admin/dashboard',
                ISSUER: '/issuer/dashboard',
                OWNER: '/owner/dashboard',
                VERIFIER: '/verifier/dashboard',
            };

            navigate(roleRoutes[user.role] || '/login');
        } catch (err) {
            console.error('Login error full:', err);
            // Don't redirect on error, just set the error message
            setError(err.response?.data?.error || err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-white font-sans flex items-center justify-center px-4 overflow-hidden selection:bg-white/30">
            {/* Background elements handling via index.css globally */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-white/[0.02] rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 w-full max-w-md bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] backdrop-blur-md p-10 animate-fade-in-up">
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className="mb-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                        {role === 'issuer' ? <BadgeCheck className="w-6 h-6 text-white stroke-[1.5]" /> : role === 'owner' ? <GraduationCap className="w-6 h-6 text-white stroke-[1.5]" /> : role === 'admin' ? <ShieldCheck className="w-6 h-6 text-white stroke-[1.5]" /> : <Lock className="w-6 h-6 text-white stroke-[1.5]" />}
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-white">
                        {role === 'issuer' ? 'Issuer Login' : role === 'owner' ? 'Student Login' : role === 'admin' ? 'Admin Login' : 'Login'}
                    </h1>
                    <p className="text-[#A1A1A1] mt-3 font-normal">
                        {role === 'issuer' ? 'Issue certificates to students' : role === 'owner' ? 'Login to view and manage your certificates' : 'Blockchain Certificate Platform'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {successMessage && (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl text-sm">
                            {successMessage}
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm">
                            {error}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#A1A1A1] mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#A1A1A1] mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-600"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                    >
                        {loading ? 'Authenticating...' : <span className="flex items-center">Enter <ArrowUpRight className="ml-2 w-4 h-4 stroke-[2]" /></span>}
                    </button>
                </form>

                <div className="mt-8 text-center space-y-4 pt-6 border-t border-white/[0.08]">
                    {role === 'owner' && (
                        <div>
                            <span className="text-sm text-[#A1A1A1]">Don't have an account? </span>
                            <button
                                type="button"
                                onClick={() => navigate('/student-onboard')}
                                className="text-sm text-white hover:text-gray-300 font-medium transition-colors"
                            >
                                Register here
                            </button>
                        </div>
                    )}
                    <div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm text-[#A1A1A1] hover:text-white transition-colors flex items-center justify-center w-full"
                        >
                            <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to role selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
