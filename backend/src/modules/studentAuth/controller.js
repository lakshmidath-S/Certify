const studentAuthService = require('./service');

async function requestOTP(req, res) {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email is required'
            });
        }

        const result = await studentAuthService.requestOTP(email);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Request OTP error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function verifyOTP(req, res) {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({
                success: false,
                error: 'Email and OTP are required'
            });
        }

        const result = await studentAuthService.verifyOTP(email, otp);

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function completeRegistration(req, res) {
    try {
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                error: 'All fields are required'
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                error: 'Password must be at least 6 characters'
            });
        }

        const result = await studentAuthService.completeRegistration(
            email,
            password,
            firstName,
            lastName
        );

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Complete registration error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

module.exports = {
    requestOTP,
    verifyOTP,
    completeRegistration
};
