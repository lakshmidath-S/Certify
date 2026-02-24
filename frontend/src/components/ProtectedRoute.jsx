import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children }) => {
    const { isAuthenticated, loading, user } = useAuth();

    console.log('🔐 ProtectedRoute:', { isAuthenticated, user });

    if (loading) return null;

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export const RoleRoute = ({ allowedRoles, children }) => {
    const { user } = useAuth();

    console.log('🎭 RoleRoute:', user?.role, allowedRoles);

    if (!user || !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />;
    }

    return children;
};
