import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { BadgeCheck, Plus, Link as LinkIcon, Ban, RefreshCw, CheckCircle, AlertTriangle } from 'lucide-react';
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

            setMessage(`Issuer "${institutionName}" created! Temp Password: ${result.data.tempPassword}`);
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
            setMessage(`Wallet mapped! TX: ${result.wallet?.txHash || 'success'}`);
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
            setMessage(`Wallet revoked! TX: ${result.txHash}`);
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
        { id: 'issuers', label: <span className="flex items-center gap-2"><BadgeCheck className="w-4 h-4" /> Issuers</span>, count: issuers.length },
        { id: 'create', label: <span className="flex items-center gap-2"><Plus className="w-4 h-4" /> Add Issuer</span> },
        { id: 'wallets', label: <span className="flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Map Wallet</span> },
        { id: 'revoke', label: <span className="flex items-center gap-2"><Ban className="w-4 h-4" /> Revoke Wallet</span> },
    ];

    return (
        <DashboardLayout title="Admin Area">
            <div className="space-y-6 animate-fade-in-up">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Admin Dashboard</h1>
                        <p className="text-[#A1A1A1] text-sm">Manage institutions, wallets, and platform security.</p>
                    </div>
                </div>

                {/* Messages */}
                {message && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl text-sm flex items-center">
                        <CheckCircle className="w-4 h-4 mr-2" /> {message}
                    </div>
                )}
                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm flex items-center">
                        <AlertTriangle className="w-4 h-4 mr-2" /> {error}
                    </div>
                )}

                {/* Tabs Container */}
                <div className="bg-[#111111]/80 backdrop-blur-md border border-white/[0.08] p-1.5 rounded-full flex overflow-x-auto shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }}
                            className={`flex-1 min-w-max py-2.5 px-6 rounded-full text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === tab.id
                                ? 'bg-white text-black shadow-lg shadow-black/20'
                                : 'text-[#A1A1A1] hover:text-white hover:bg-white/[0.04]'
                                }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`flex h-5 items-center px-1.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-[#111111] text-white' : 'bg-white/[0.08] text-[#A1A1A1]'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] overflow-hidden">

                    {/* TAB: Issuers List */}
                    {activeTab === 'issuers' && (
                        <div>
                            <div className="px-8 py-6 border-b border-white/[0.08] flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-white">Registered Issuers</h2>
                                    <p className="text-sm text-[#A1A1A1] mt-1">All universities and institutions</p>
                                </div>
                                <button onClick={fetchIssuers} className="text-sm text-[#A1A1A1] hover:text-white transition-colors flex items-center gap-1.5">
                                    <RefreshCw className="w-4 h-4" /> Refresh
                                </button>
                            </div>

                            {issuersLoading ? (
                                <div className="px-6 py-16 text-center text-[#A1A1A1]">
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4"></div>
                                        <p>Loading issuers...</p>
                                    </div>
                                </div>
                            ) : issuers.length === 0 ? (
                                <div className="px-6 py-16 text-center text-[#A1A1A1]">
                                    <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                        <BadgeCheck className="w-6 h-6 text-white stroke-[1.5]" />
                                    </div>
                                    <p className="text-white font-medium mb-1">No issuers yet</p>
                                    <p className="text-sm">Click "Add Issuer" to register a university</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="border-b border-white/[0.08] bg-[#111111]/30">
                                                <th className="px-8 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Institution</th>
                                                <th className="px-8 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Email</th>
                                                <th className="px-8 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Wallet</th>
                                                <th className="px-8 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {issuers.map((issuer) => (
                                                <tr key={issuer.id} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-white flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center text-xs text-[#A1A1A1]">
                                                                {(issuer.institution_name || issuer.email).charAt(0).toUpperCase()}
                                                            </div>
                                                            {issuer.institution_name || issuer.email}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-sm text-[#A1A1A1]">
                                                        {issuer.email}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        {issuer.wallet_address ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium font-mono">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                                                {issuer.wallet_address.substring(0, 6)}...{issuer.wallet_address.substring(38)}
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2"></span>
                                                                Not mapped
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-sm text-[#A1A1A1]">
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
                        <div className="p-8 max-w-3xl">
                            <h2 className="text-2xl font-semibold mb-2 text-white">Add New Issuer</h2>
                            <p className="text-sm text-[#A1A1A1] mb-8">Register a university or educational institution to issue certificates.</p>

                            <form onSubmit={handleCreateIssuer} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Institution Name *</label>
                                    <input
                                        type="text"
                                        value={institutionName}
                                        onChange={(e) => setInstitutionName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                        placeholder="e.g. Harvard University"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Official Email *</label>
                                    <input
                                        type="email"
                                        value={officialEmail}
                                        onChange={(e) => setOfficialEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                        placeholder="admin@university.edu"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Contact Person</label>
                                        <input
                                            type="text"
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Contact Phone</label>
                                        <input
                                            type="tel"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Website</label>
                                    <input
                                        type="url"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                        placeholder="https://university.edu"
                                    />
                                </div>

                                <div className="pt-4 border-t border-white/[0.08]">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-full bg-white px-8 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                    >
                                        {loading ? 'Creating Account...' : 'Create Issuer Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}

                    {/* TAB: Map Wallet */}
                    {activeTab === 'wallets' && (
                        <div className="p-8 max-w-3xl">
                            <h2 className="text-2xl font-semibold mb-2 text-white">Map Issuer Wallet</h2>
                            <p className="text-sm text-[#A1A1A1] mb-8">
                                Link an issuer's account to their blockchain wallet address to enable certificate issuance.
                            </p>

                            {issuersWithoutWallet.length === 0 && !issuersLoading ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-6 py-12 rounded-2xl text-center">
                                    <div className="mx-auto mb-6 w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                        <CheckCircle className="w-6 h-6 text-emerald-400 stroke-[1.5]" />
                                    </div>
                                    <div className="font-semibold text-lg mb-1">All Caught Up!</div>
                                    <div className="text-sm opacity-80">All registered issuers currently have a wallet mapped.</div>
                                </div>
                            ) : (
                                <form onSubmit={handleMapWallet} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Select Issuer *</label>
                                        <div className="relative">
                                            <select
                                                value={selectedIssuerId}
                                                onChange={(e) => setSelectedIssuerId(e.target.value)}
                                                className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="" disabled className="text-zinc-600">-- Choose an issuer --</option>
                                                {issuersWithoutWallet.map(issuer => (
                                                    <option key={issuer.id} value={issuer.id}>
                                                        {issuer.institution_name || issuer.email}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#A1A1A1]">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Wallet Address *</label>
                                        <input
                                            type="text"
                                            value={walletAddress}
                                            onChange={(e) => setWalletAddress(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700 font-mono text-sm"
                                            placeholder="0x..."
                                            required
                                        />
                                        <p className="text-xs text-zinc-500 mt-2">The issuer's MetaMask wallet address on Base Sepolia.</p>
                                    </div>

                                    <div className="pt-4 border-t border-white/[0.08]">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="rounded-full bg-white px-8 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                        >
                                            {loading ? 'Mapping on blockchain...' : 'Map Wallet on Chain'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    )}

                    {/* TAB: Revoke Wallet */}
                    {activeTab === 'revoke' && (
                        <div className="p-8 max-w-3xl">
                            <h2 className="text-2xl font-semibold mb-2 text-white">Revoke Issuer Wallet</h2>
                            <p className="text-sm text-[#A1A1A1] mb-8">
                                Revoke an issuer's wallet to permanently block them from issuing new certificates.
                            </p>

                            <form onSubmit={handleRevokeWallet} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Select Mapped Wallet *</label>
                                    <div className="relative">
                                        <select
                                            value={revokeAddress}
                                            onChange={(e) => setRevokeAddress(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="" disabled className="text-zinc-600">-- Select a wallet to revoke --</option>
                                            {issuers.filter(i => i.wallet_address).map(issuer => (
                                                <option key={issuer.id} value={issuer.wallet_address}>
                                                    {issuer.institution_name || issuer.email} — {issuer.wallet_address.substring(0, 10)}...
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-[#A1A1A1]">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Reason for Revocation *</label>
                                    <textarea
                                        value={revokeReason}
                                        onChange={(e) => setRevokeReason(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-red-500/50 transition-all placeholder:text-zinc-700 resize-none"
                                        rows="4"
                                        placeholder="Explain why this wallet is being revoked. This will be recorded on-chain."
                                        required
                                    />
                                </div>

                                <div className="pt-4 border-t border-white/[0.08]">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-full bg-red-600 border border-red-500 hover:bg-red-500 px-8 py-3.5 text-white font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(220,38,38,0.2)]"
                                    >
                                        {loading ? 'Processing Revocation...' : <span className="flex items-center justify-center"><AlertTriangle className="w-4 h-4 mr-2" /> Revoke Wallet Access</span>}
                                    </button>
                                </div>
                            </form>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
