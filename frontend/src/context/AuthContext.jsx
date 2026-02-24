import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI, walletAuthAPI } from '../api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        const storedUser = localStorage.getItem('user');

        if (storedToken && storedUser) {
            setToken(storedToken);
            setUser(JSON.parse(storedUser));
        }

        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const data = await authAPI.login(email, password);

        console.log('🟢 LOGIN RESPONSE:', data);

        // ✅ Backend returns ONLY user (no token yet)
        if (!data?.user) {
            throw new Error('Invalid login response');
        }

        // 🔐 AUTH SUCCESS: store actual token
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);

        setUser(data.user);
        setToken(data.token);

        return data.user;
    };

    const loginWithWallet = async (walletAddress, signature, message) => {
        const data = await walletAuthAPI.verifySignature(walletAddress, signature, message);

        console.log('🟢 WALLET LOGIN RESPONSE:', data);

        if (!data?.user || !data?.signingToken) {
            throw new Error('Invalid wallet login response');
        }

        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.signingToken);
        localStorage.setItem('signingToken', data.signingToken); // also store as signingToken for consistency

        setUser(data.user);
        setToken(data.signingToken);

        return data.user;
    };


    const logout = () => {
        localStorage.clear();
        setUser(null);
        setToken(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                token,
                role: user?.role,
                loading,
                isAuthenticated: !!token,
                login,
                loginWithWallet,
                logout,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};
