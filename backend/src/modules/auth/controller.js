const authService = require('./service');

async function register(req, res) {
    try {
        const { email, password, role, firstName, lastName } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({
                success: false,
                error: 'Email, password, and role are required'
            });
        }

        if (!['ADMIN', 'ISSUER', 'OWNER', 'VERIFIER'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 8 characters'
            });
        }

        const user = await authService.register({
            email,
            password,
            role,
            firstName,
            lastName
        });

        res.status(201).json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function login(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                error: 'Email and password are required'
            });
        }

        const result = await authService.login(email, password);

        res.json({
            success: true,
            accessToken: result.accessToken,
            user: result.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(401).json({
            success: false,
            error: error.message
        });
    }
}

async function verifyAdminWallet(req, res) {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const result = authService.verifyAdminWallet(walletAddress);

        res.json({
            success: true,
            allowed: result.allowed
        });
    } catch (error) {
        console.error('Admin wallet verification error:', error);
        res.status(403).json({
            success: false,
            allowed: false,
            error: error.message
        });
    }
}

async function getProfile(req, res) {
    try {
        const user = await authService.getUserById(req.user.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                email: user.email,
                role: user.role,
                firstName: user.first_name,
                lastName: user.last_name,
                status: user.status,
                createdAt: user.created_at
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
}

async function verifyIssuerWallet(req, res) {
    try {
        const { walletAddress } = req.body;

        if (!walletAddress) {
            return res.status(400).json({
                success: false,
                error: 'Wallet address is required'
            });
        }

        const result = await authService.verifyIssuerWallet(walletAddress, req.user.id);

        res.json({
            success: true,
            verified: true,
            walletId: result.walletId
        });
    } catch (error) {
        console.error('Issuer wallet verification error:', error);
        res.status(403).json({
            success: false,
            verified: false,
            error: error.message
        });
    }
}

module.exports = {
    register,
    login,
    verifyAdminWallet,
    verifyIssuerWallet,
    getProfile
};
