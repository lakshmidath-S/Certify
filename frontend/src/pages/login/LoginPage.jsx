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
        <div className="min-h-screen text-slate-800 font-sans flex items-center justify-center px-4 overflow-hidden selection:bg-blue-600/30">
            {/* Background elements handling via index.css globally */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className={`relative z-10 w-full max-w-md bg-white rounded-[28px] p-10 animate-fade-in-up overflow-hidden
                ${role === 'issuer'
                    ? 'border-2 border-emerald-400 shadow-[0_8px_32px_rgb(16,185,129,0.18)]'
                    : role === 'admin'
                        ? 'border-2 border-violet-400 shadow-[0_8px_32px_rgb(124,58,237,0.18)]'
                        : 'border-2 border-blue-400 shadow-[0_8px_32px_rgb(37,99,235,0.18)]'
                }`}>
                <div className="text-center mb-8 flex flex-col items-center">
                    <div className={`mb-6 w-12 h-12 flex items-center justify-center rounded-2xl border shadow-sm ${
                        role === 'issuer' ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
                        : role === 'admin' ? 'bg-violet-50 border-violet-200 text-violet-600'
                        : 'bg-blue-50 border-blue-200 text-blue-600'
                    }`}>
                        {role === 'issuer' ? <BadgeCheck className="w-6 h-6 stroke-[1.5]" /> : role === 'owner' ? <GraduationCap className="w-6 h-6 stroke-[1.5]" /> : role === 'admin' ? <ShieldCheck className="w-6 h-6 stroke-[1.5]" /> : <Lock className="w-6 h-6 stroke-[1.5]" />}
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                        {role === 'issuer' ? 'Issuer Login' : role === 'owner' ? 'Student Login' : role === 'admin' ? 'Admin Login' : 'Login'}
                    </h1>
                    <p className="text-slate-600 mt-3 font-normal">
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
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                placeholder="name@example.com"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex items-center justify-center rounded-full bg-blue-600 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                    >
                        {loading ? 'Authenticating...' : <span className="flex items-center">Enter <ArrowUpRight className="ml-2 w-4 h-4 stroke-[2]" /></span>}
                    </button>
                </form>

                <div className="mt-8 text-center space-y-4 pt-6 border-t border-blue-50">
                    {role === 'owner' && (
                        <div>
                            <span className="text-sm text-slate-500">Don't have an account? </span>
                            <button
                                type="button"
                                onClick={() => navigate('/student-onboard')}
                                className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                            >
                                Register here
                            </button>
                        </div>
                    )}
                    <div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm text-slate-500 hover:text-slate-900 transition-colors flex items-center justify-center w-full"
                        >
                            <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to role selection
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
