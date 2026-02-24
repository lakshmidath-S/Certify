import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-[#A1A1A1] flex items-center justify-center font-sans">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4"></div>
                    <p className="text-sm">Authenticating session...</p>
                </div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export const RoleRoute = ({ children, allowedRoles }) => {
    const { role, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen bg-[#050505] text-[#A1A1A1] flex items-center justify-center font-sans">
                <div className="animate-pulse flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4"></div>
                    <p className="text-sm">Verifying access rights...</p>
                </div>
            </div>
        );
    }

    if (!allowedRoles.includes(role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};
