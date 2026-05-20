import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export const DashboardLayout = ({ children, title }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className="min-h-screen text-slate-800 font-sans selection:bg-blue-600/30">
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
                <div className="mx-auto flex items-center justify-between rounded-full border border-blue-100 bg-white/90 px-6 py-3 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold text-xs">C</span>
                            </div>
                            <span className="text-lg font-semibold tracking-tight text-slate-900">CERTIFY</span>
                        </Link>
                        {title && (
                            <>
                                <span className="text-blue-300 mx-2">/</span>
                                <span className="text-sm font-medium text-slate-600">{title}</span>
                            </>
                        )}
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4">
                        <span className="text-xs font-medium text-blue-700 bg-[#eff6ff] px-3 py-1 rounded-full border border-blue-100">
                            {user?.role}
                        </span>
                        <span className="text-xs text-slate-500">
                            {user?.email}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="text-sm rounded-full bg-blue-600 px-6 py-2.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <main className="mx-auto max-w-6xl px-4 pt-32 pb-12">
                {children}
            </main>
        </div>
    );
};
