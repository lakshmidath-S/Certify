const adminService = require('./service');

async function createIssuer(req, res) {
    try {
        const {
            institutionName,
            officialEmail,
            contactPerson,
            contactPhone,
            website,
            walletAddress,
            adminPrivateKey
        } = req.body;

        if (!institutionName || !officialEmail) {
            return res.status(400).json({
                success: false,
                error: 'Institution name and email are required'
            });
        }

        const result = await adminService.createIssuer(req.user.id, {
            institutionName,
            officialEmail,
            contactPerson,
            contactPhone,
            website,
            walletAddress,
            adminPrivateKey
        });

        res.json({
            success: true,
            ...result
        });
    } catch (error) {
        console.error('Create issuer error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}

async function listIssuers(req, res) {
    try {
        const issuers = await adminService.listIssuers(req.user.id);

        res.json({
            success: true,
            issuers
        });
    } catch (error) {
        console.error('List issuers error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
}


async function suspendIssuer(req, res) {
    try {
        const { issuerId } = req.body;
        if (!issuerId) return res.status(400).json({ success: false, error: 'issuerId is required' });

        const result = await adminService.suspendIssuer(issuerId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
}

async function reactivateIssuer(req, res) {
    try {
        const { issuerId } = req.body;
        if (!issuerId) return res.status(400).json({ success: false, error: 'issuerId is required' });

        const result = await adminService.reactivateIssuer(issuerId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
}

async function reportCompromise(req, res) {
    try {
        const { issuerId } = req.body;
        if (!issuerId) return res.status(400).json({ success: false, error: 'issuerId is required' });

        const result = await adminService.reportCompromise(issuerId);
        res.json(result);
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
}

module.exports = {
    createIssuer,
    listIssuers,
    suspendIssuer,
    reactivateIssuer,
    reportCompromise
};
