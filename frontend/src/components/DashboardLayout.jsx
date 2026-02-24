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
        <div className="min-h-screen text-white font-sans selection:bg-white/30">
            {/* Floating Navbar */}
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
                <div className="mx-auto flex items-center justify-between rounded-full border border-white/[0.08] bg-[#0A0A0A]/60 px-6 py-3 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3">
                            <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
                                <span className="text-black font-bold text-xs">C</span>
                            </div>
                            <span className="text-lg font-semibold tracking-tight">CERTIFY</span>
                        </Link>
                        {title && (
                            <>
                                <span className="text-[#A1A1A1] mx-2">/</span>
                                <span className="text-sm font-medium text-[#A1A1A1]">{title}</span>
                            </>
                        )}
                    </div>

                    <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-4">
                        <span className="text-xs font-medium text-[#A1A1A1] bg-[#111111] px-3 py-1 rounded-full border border-white/[0.08]">
                            {user?.role}
                        </span>
                        <span className="text-xs text-[#A1A1A1]">
                            {user?.email}
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleLogout}
                            className="text-sm rounded-full bg-white px-6 py-2.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
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
