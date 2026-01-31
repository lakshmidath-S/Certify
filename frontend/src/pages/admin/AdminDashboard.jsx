import { useState } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { walletAPI } from '../../api';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function AdminDashboard() {
    // Issuer creation state
    const [institutionName, setInstitutionName] = useState('');
    const [officialEmail, setOfficialEmail] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [website, setWebsite] = useState('');
    const [issuerWalletAddress, setIssuerWalletAddress] = useState('');

    // Wallet mapping state
    const [walletAddress, setWalletAddress] = useState('');
    const [userId, setUserId] = useState('');
    const [adminPrivateKey, setAdminPrivateKey] = useState('');
    const [revokeAddress, setRevokeAddress] = useState('');
    const [revokeReason, setRevokeReason] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleCreateIssuer = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token');
            const result = await axios.post(
                `${API_BASE}/admin/create-issuer`,
                {
                    institutionName,
                    officialEmail,
                    contactPerson,
                    contactPhone,
                    website,
                    walletAddress: issuerWalletAddress
                },
                {
                    headers: { Authorization: `Bearer ${token}` }
                }
            );

            setMessage(`Issuer created! Email: ${result.data.user.email}, Temp Password: ${result.data.tempPassword}`);
            setInstitutionName('');
            setOfficialEmail('');
            setContactPerson('');
            setContactPhone('');
            setWebsite('');
            setIssuerWalletAddress('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create issuer');
        } finally {
            setLoading(false);
        }
    };

    const handleMapWallet = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const result = await walletAPI.mapWallet(walletAddress, userId, adminPrivateKey);
            setMessage(`Wallet mapped successfully! TX: ${result.wallet.txHash}`);
            setWalletAddress('');
            setUserId('');
            setAdminPrivateKey('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to map wallet');
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeWallet = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const result = await walletAPI.revokeWallet(revokeAddress, revokeReason, adminPrivateKey);
            setMessage(`Wallet revoked successfully! TX: ${result.txHash}`);
            setRevokeAddress('');
            setRevokeReason('');
            setAdminPrivateKey('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to revoke wallet');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Admin Dashboard">
            <div className="space-y-6">
                {message && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                        {message}
                    </div>
                )}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                        {error}
                    </div>
                )}

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Create Issuer (Institution)</h2>
                    <form onSubmit={handleCreateIssuer} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Institution Name *
                            </label>
                            <input
                                type="text"
                                value={institutionName}
                                onChange={(e) => setInstitutionName(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Harvard University"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Official Email *
                            </label>
                            <input
                                type="email"
                                value={officialEmail}
                                onChange={(e) => setOfficialEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="admin@university.edu"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contact Person
                                </label>
                                <input
                                    type="text"
                                    value={contactPerson}
                                    onChange={(e) => setContactPerson(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="John Doe"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contact Phone
                                </label>
                                <input
                                    type="tel"
                                    value={contactPhone}
                                    onChange={(e) => setContactPhone(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="+1234567890"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Website
                            </label>
                            <input
                                type="url"
                                value={website}
                                onChange={(e) => setWebsite(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="https://university.edu"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Wallet Address (optional, can map later)
                            </label>
                            <input
                                type="text"
                                value={issuerWalletAddress}
                                onChange={(e) => setIssuerWalletAddress(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0x..."
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
                        >
                            {loading ? 'Creating...' : 'Create Issuer Account'}
                        </button>
                    </form>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Map Issuer Wallet</h2>
                    <form onSubmit={handleMapWallet} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Wallet Address
                            </label>
                            <input
                                type="text"
                                value={walletAddress}
                                onChange={(e) => setWalletAddress(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0x..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                User ID
                            </label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="UUID"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Private Key
                            </label>
                            <input
                                type="password"
                                value={adminPrivateKey}
                                onChange={(e) => setAdminPrivateKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0x..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            {loading ? 'Mapping...' : 'Map Wallet'}
                        </button>
                    </form>
                </div>

                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Revoke Issuer Wallet</h2>
                    <form onSubmit={handleRevokeWallet} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Wallet Address
                            </label>
                            <input
                                type="text"
                                value={revokeAddress}
                                onChange={(e) => setRevokeAddress(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0x..."
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Reason
                            </label>
                            <textarea
                                value={revokeReason}
                                onChange={(e) => setRevokeReason(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                rows="3"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Admin Private Key
                            </label>
                            <input
                                type="password"
                                value={adminPrivateKey}
                                onChange={(e) => setAdminPrivateKey(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="0x..."
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                            {loading ? 'Revoking...' : 'Revoke Wallet'}
                        </button>
                    </form>
                </div>
            </div>
        </DashboardLayout>
    );
}
