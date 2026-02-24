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

        if (!['ADMIN', 'ISSUER', 'STUDENT', 'VERIFIER'].includes(role)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid role'
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
            user
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

        const result = await authService.login(email, password);

        console.log('✅ LOGIN SUCCESS:', result.user.email, result.user.role);

        // 🛡️ Set httpOnly cookie (Phase 8 Hardening)
        res.cookie('token', result.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 3600000 // 1 hour
        });

        return res.status(200).json({
            success: true,
            user: result.user,
            token: result.token // Keep token in response for legacy/mobile if needed
        });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        return res.status(401).json({
            success: false,
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
            user
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get profile'
        });
    }
}

module.exports = {
    register,
    login,
    getProfile
};
