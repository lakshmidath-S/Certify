import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { walletAPI } from '../../api';
import axios from 'axios';

const API_BASE = 'http://localhost:3000/api';

export default function AdminDashboard() {
    // Tab state
    const [activeTab, setActiveTab] = useState('issuers');

    // Issuers list state
    const [issuers, setIssuers] = useState([]);
    const [issuersLoading, setIssuersLoading] = useState(false);

    // Issuer creation state
    const [institutionName, setInstitutionName] = useState('');
    const [officialEmail, setOfficialEmail] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [website, setWebsite] = useState('');

    // Wallet mapping state
    const [selectedIssuerId, setSelectedIssuerId] = useState('');
    const [walletAddress, setWalletAddress] = useState('');

    // Wallet revocation state
    const [revokeAddress, setRevokeAddress] = useState('');
    const [revokeReason, setRevokeReason] = useState('');

    // General UI state
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('token');
    const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

    // Fetch issuers on mount and when tab changes
    useEffect(() => {
        if (activeTab === 'issuers' || activeTab === 'wallets') {
            fetchIssuers();
        }
    }, [activeTab]);

    const fetchIssuers = async () => {
        setIssuersLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/admin/issuers`, authHeaders);
            setIssuers(res.data.issuers || []);
        } catch (err) {
            console.error('Failed to fetch issuers:', err);
        } finally {
            setIssuersLoading(false);
        }
    };

    const handleCreateIssuer = async (e) => {
        e.preventDefault();
        setMessage('');
        setError('');
        setLoading(true);

        try {
            const result = await axios.post(
                `${API_BASE}/admin/create-issuer`,
                { institutionName, officialEmail, contactPerson, contactPhone, website },
                authHeaders
            );

            setMessage(`✅ Issuer "${institutionName}" created! Temp Password: ${result.data.tempPassword}`);
            setInstitutionName('');
            setOfficialEmail('');
            setContactPerson('');
            setContactPhone('');
            setWebsite('');
            fetchIssuers();
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
            const result = await walletAPI.mapWallet(walletAddress, selectedIssuerId);
            setMessage(`✅ Wallet mapped! TX: ${result.wallet?.txHash || 'success'}`);
            setWalletAddress('');
            setSelectedIssuerId('');
            fetchIssuers();
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
            const result = await walletAPI.revokeWallet(revokeAddress, revokeReason);
            setMessage(`✅ Wallet revoked! TX: ${result.txHash}`);
            setRevokeAddress('');
            setRevokeReason('');
            fetchIssuers();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to revoke wallet');
        } finally {
            setLoading(false);
        }
    };

    // Filter issuers without a wallet for the dropdown
    const issuersWithoutWallet = issuers.filter(i => !i.wallet_address);

    const tabs = [
        { id: 'issuers', label: '🏛️ Issuers', count: issuers.length },
        { id: 'create', label: '➕ Add Issuer' },
        { id: 'wallets', label: '🔗 Map Wallet' },
        { id: 'revoke', label: '🚫 Revoke Wallet' },
    ];

    return (
        <DashboardLayout title="Admin Dashboard">
            <div className="space-y-6">
                {/* Tabs */}
                <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }}
                            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'bg-white text-purple-700 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            {tab.label} {tab.count !== undefined && <span className="ml-1 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{tab.count}</span>}
                        </button>
                    ))}
                </div>

                {/* Messages */}
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

                {/* TAB: Issuers List */}
                {activeTab === 'issuers' && (
                    <div className="bg-white shadow rounded-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-xl font-semibold">Registered Issuers</h2>
                            <p className="text-sm text-gray-500 mt-1">All universities and institutions</p>
                        </div>

                        {issuersLoading ? (
                            <div className="px-6 py-8 text-center text-gray-500">Loading issuers...</div>
                        ) : issuers.length === 0 ? (
                            <div className="px-6 py-8 text-center text-gray-500">
                                <p className="text-lg mb-2">No issuers yet</p>
                                <p className="text-sm">Click "Add Issuer" to register a university</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Wallet</th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {issuers.map((issuer) => (
                                            <tr key={issuer.id} className="hover:bg-gray-50">
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {issuer.institution_name || issuer.email}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{issuer.email}</td>
                                                <td className="px-6 py-4 text-sm">
                                                    {issuer.wallet_address ? (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            ✅ {issuer.wallet_address.substring(0, 6)}...{issuer.wallet_address.substring(38)}
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            ⚠️ Not mapped
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {issuer.created_at ? new Date(issuer.created_at).toLocaleDateString() : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* TAB: Create Issuer */}
                {activeTab === 'create' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Add New Issuer (University / Institution)</h2>
                        <form onSubmit={handleCreateIssuer} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Institution Name *</label>
                                <input
                                    type="text"
                                    value={institutionName}
                                    onChange={(e) => setInstitutionName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="e.g. Harvard University"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Official Email *</label>
                                <input
                                    type="email"
                                    value={officialEmail}
                                    onChange={(e) => setOfficialEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="admin@university.edu"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
                                    <input
                                        type="text"
                                        value={contactPerson}
                                        onChange={(e) => setContactPerson(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                                    <input
                                        type="tel"
                                        value={contactPhone}
                                        onChange={(e) => setContactPhone(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="+1234567890"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                                <input
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                                    placeholder="https://university.edu"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium"
                            >
                                {loading ? 'Creating...' : 'Create Issuer Account'}
                            </button>
                        </form>
                    </div>
                )}

                {/* TAB: Map Wallet */}
                {activeTab === 'wallets' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-2">Map Issuer Wallet</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Select an issuer and enter their blockchain wallet address to map it on-chain.
                        </p>

                        {issuersWithoutWallet.length === 0 && !issuersLoading ? (
                            <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded">
                                All issuers already have wallets mapped. Create a new issuer first.
                            </div>
                        ) : (
                            <form onSubmit={handleMapWallet} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Issuer *</label>
                                    <select
                                        value={selectedIssuerId}
                                        onChange={(e) => setSelectedIssuerId(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        required
                                    >
                                        <option value="">-- Choose an issuer --</option>
                                        {issuersWithoutWallet.map(issuer => (
                                            <option key={issuer.id} value={issuer.id}>
                                                {issuer.institution_name || issuer.email} ({issuer.email})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address *</label>
                                    <input
                                        type="text"
                                        value={walletAddress}
                                        onChange={(e) => setWalletAddress(e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="0x..."
                                        required
                                    />
                                    <p className="text-xs text-gray-400 mt-1">The issuer's MetaMask wallet address (42 characters starting with 0x)</p>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                                >
                                    {loading ? 'Mapping on blockchain...' : 'Map Wallet'}
                                </button>
                            </form>
                        )}
                    </div>
                )}

                {/* TAB: Revoke Wallet */}
                {activeTab === 'revoke' && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-2">Revoke Issuer Wallet</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Revoke an issuer's wallet to prevent them from issuing certificates.
                        </p>

                        <form onSubmit={handleRevokeWallet} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Wallet Address *</label>
                                <select
                                    value={revokeAddress}
                                    onChange={(e) => setRevokeAddress(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
                                    required
                                >
                                    <option value="">-- Select a wallet to revoke --</option>
                                    {issuers.filter(i => i.wallet_address).map(issuer => (
                                        <option key={issuer.id} value={issuer.wallet_address}>
                                            {issuer.institution_name || issuer.email} — {issuer.wallet_address.substring(0, 10)}...
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                                <textarea
                                    value={revokeReason}
                                    onChange={(e) => setRevokeReason(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                    rows="3"
                                    placeholder="Why is this wallet being revoked?"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-red-600 text-white py-2.5 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                            >
                                {loading ? 'Revoking on blockchain...' : 'Revoke Wallet'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
