import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { BadgeCheck, Plus, Link as LinkIcon, Ban, RefreshCw, CheckCircle, AlertTriangle, Copy, X, KeyRound } from 'lucide-react';
import { walletAPI } from '../../api';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';

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

    // Password modal state
    const [createdIssuer, setCreatedIssuer] = useState(null); // { email, tempPassword, institutionName }
    const [copied, setCopied] = useState(false);

    const handleCopyPassword = () => {
        if (!createdIssuer) return;
        navigator.clipboard.writeText(createdIssuer.tempPassword).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

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

            setCreatedIssuer({
                institutionName,
                email: officialEmail,
                tempPassword: result.data.tempPassword
            });
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

            {/* ===== TEMP PASSWORD MODAL ===== */}
            {createdIssuer && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white border border-blue-100 rounded-3xl p-8 max-w-md w-full mx-4 shadow-[0_20px_60px_rgb(13,110,253,0.12)] animate-fade-in-up">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                    <KeyRound className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div>
                                    <h3 className="text-slate-900 font-semibold text-lg">Issuer Created!</h3>
                                    <p className="text-slate-500 text-xs">Save this password — it won't be shown again</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setCreatedIssuer(null)}
                                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Institution</p>
                                <p className="text-slate-900 font-medium">{createdIssuer.institutionName}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Login Email</p>
                                <p className="text-slate-900 font-mono text-sm">{createdIssuer.email}</p>
                            </div>
                            <div>
                                <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Temporary Password</p>
                                <div className="flex items-center gap-3 bg-[#eff6ff] border border-blue-100 rounded-2xl px-4 py-3">
                                    <span className="flex-1 text-slate-900 font-mono text-sm tracking-widest select-all">{createdIssuer.tempPassword}</span>
                                    <button
                                        onClick={handleCopyPassword}
                                        className="text-slate-400 hover:text-blue-600 transition-colors flex-shrink-0"
                                        title="Copy password"
                                    >
                                        {copied
                                            ? <CheckCircle className="w-4 h-4 text-emerald-500" />
                                            : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl px-4 py-3 text-yellow-700 text-xs mb-6 flex items-start gap-2">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                            <span>Share this password securely with the institution. It cannot be recovered after closing this dialog.</span>
                        </div>

                        <button
                            onClick={() => setCreatedIssuer(null)}
                            className="w-full rounded-full bg-blue-600 text-white font-semibold py-3 hover:bg-blue-700 transition-all shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                        >
                            I've saved the password
                        </button>
                    </div>
                </div>
            )}
            <div className="space-y-6 animate-fade-in-up">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">Admin Dashboard</h1>
                        <p className="text-slate-500 text-sm">Manage institutions, wallets, and platform security.</p>
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
                <div className="bg-white border border-violet-100 p-1.5 rounded-full flex overflow-x-auto shadow-[0_2px_10px_rgb(124,58,237,0.08)] scrollbar-hide">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => { setActiveTab(tab.id); setMessage(''); setError(''); }}
                            className={`flex-1 min-w-max py-2.5 px-6 rounded-full text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${activeTab === tab.id
                                ? 'bg-violet-600 text-white shadow-[0_4px_14px_0_rgb(124,58,237,0.39)]'
                                : 'text-slate-500 hover:text-violet-600 hover:bg-violet-50'
                                }`}
                        >
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={`flex h-5 items-center px-1.5 rounded-full text-[10px] font-bold ${activeTab === tab.id ? 'bg-white text-violet-600' : 'bg-violet-50 text-violet-500'}`}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                {/* Main Content Area */}
                <div className="relative bg-white rounded-[28px] border-2 border-violet-400 shadow-[0_8px_32px_rgb(124,58,237,0.15)] overflow-hidden">

                    {/* TAB: Issuers List */}
                    {activeTab === 'issuers' && (
                        <div>
                            <div className="px-8 py-6 border-b border-blue-50 flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-slate-900">Registered Issuers</h2>
                                    <p className="text-sm text-slate-500 mt-1">All universities and institutions</p>
                                </div>
                                <button onClick={fetchIssuers} className="text-sm text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5">
                                    <RefreshCw className="w-4 h-4" /> Refresh
                                </button>
                            </div>

                            {issuersLoading ? (
                                <div className="px-6 py-16 text-center text-slate-500">
                                    <div className="animate-pulse flex flex-col items-center">
                                        <div className="h-8 w-8 rounded-full border-2 border-blue-100 border-t-blue-600 animate-spin mb-4"></div>
                                        <p>Loading issuers...</p>
                                    </div>
                                </div>
                            ) : issuers.length === 0 ? (
                                <div className="px-6 py-16 text-center text-slate-500">
                                    <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-[#eff6ff] border border-blue-100">
                                        <BadgeCheck className="w-6 h-6 text-blue-600 stroke-[1.5]" />
                                    </div>
                                    <p className="text-slate-700 font-medium mb-1">No issuers yet</p>
                                    <p className="text-sm">Click "Add Issuer" to register a university</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="border-b border-blue-50 bg-[#eff6ff]/40">
                                                <th className="px-8 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Institution</th>
                                                <th className="px-8 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Email</th>
                                                <th className="px-8 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Wallet</th>
                                                <th className="px-8 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-8 py-4 text-xs font-medium text-slate-500 uppercase tracking-wider">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50">
                                            {issuers.map((issuer) => (
                                                <tr key={issuer.id} className="hover:bg-[#eff6ff]/30 transition-colors">
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-slate-900 flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-full bg-[#eff6ff] border border-blue-100 flex items-center justify-center text-xs text-blue-600 font-bold">
                                                                {(issuer.institution_name || issuer.email).charAt(0).toUpperCase()}
                                                            </div>
                                                            {issuer.institution_name || issuer.email}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-sm text-slate-500">
                                                        {issuer.email}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        {issuer.wallet_address ? (
                                                            issuer.revoked_at ? (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-medium font-mono">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
                                                                    {issuer.wallet_address.substring(0, 6)}...{issuer.wallet_address.substring(38)}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-medium font-mono">
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                                                    {issuer.wallet_address.substring(0, 6)}...{issuer.wallet_address.substring(38)}
                                                                </span>
                                                            )
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-yellow-500/20 bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2"></span>
                                                                Not mapped
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap">
                                                        {issuer.status === 'REVOKED' ? (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold uppercase tracking-wide">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2"></span>
                                                                Revoked
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2.5 py-1 rounded border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-semibold uppercase tracking-wide">
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>
                                                                Active
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-8 py-5 whitespace-nowrap text-sm text-slate-500">
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
                            <h2 className="text-2xl font-semibold mb-2 text-slate-900">Add New Issuer</h2>
                            <p className="text-sm text-slate-500 mb-8">Register a university or educational institution to issue certificates.</p>

                            <form onSubmit={handleCreateIssuer} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Institution Name *</label>
                                    <input
                                        type="text"
                                        value={institutionName}
                                        onChange={(e) => setInstitutionName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="e.g. Harvard University"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Official Email *</label>
                                    <input
                                        type="email"
                                        value={officialEmail}
                                        onChange={(e) => setOfficialEmail(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="admin@university.edu"
                                        required
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Contact Person</label>
                                        <input
                                            type="text"
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                            placeholder="John Doe"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Contact Phone</label>
                                        <input
                                            type="tel"
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                            placeholder="+1234567890"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Website</label>
                                    <input
                                        type="url"
                                        value={website}
                                        onChange={(e) => setWebsite(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400"
                                        placeholder="https://university.edu"
                                    />
                                </div>

                                <div className="pt-4 border-t border-blue-50">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-full bg-blue-600 px-8 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
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
                            <h2 className="text-2xl font-semibold mb-2 text-slate-900">Map Issuer Wallet</h2>
                            <p className="text-sm text-slate-500 mb-8">
                                Link an issuer's account to their blockchain wallet address to enable certificate issuance.
                            </p>

                            {issuersWithoutWallet.length === 0 && !issuersLoading ? (
                                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-6 py-12 rounded-2xl text-center">
                                    <div className="mx-auto mb-6 w-12 h-12 flex items-center justify-center rounded-full bg-emerald-100 border border-emerald-200">
                                        <CheckCircle className="w-6 h-6 text-emerald-600 stroke-[1.5]" />
                                    </div>
                                    <div className="font-semibold text-lg mb-1">All Caught Up!</div>
                                    <div className="text-sm opacity-80">All registered issuers currently have a wallet mapped.</div>
                                </div>
                            ) : (
                                <form onSubmit={handleMapWallet} className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Select Issuer *</label>
                                        <div className="relative">
                                            <select
                                                value={selectedIssuerId}
                                                onChange={(e) => setSelectedIssuerId(e.target.value)}
                                                className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all appearance-none cursor-pointer"
                                                required
                                            >
                                                <option value="" disabled className="text-slate-400">-- Choose an issuer --</option>
                                                {issuersWithoutWallet.map(issuer => (
                                                    <option key={issuer.id} value={issuer.id}>
                                                        {issuer.institution_name || issuer.email}
                                                    </option>
                                                ))}
                                            </select>
                                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-2">Wallet Address *</label>
                                        <input
                                            type="text"
                                            value={walletAddress}
                                            onChange={(e) => setWalletAddress(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:bg-white transition-all placeholder:text-slate-400 font-mono text-sm"
                                            placeholder="0x..."
                                            required
                                        />
                                        <p className="text-xs text-slate-400 mt-2">The issuer's MetaMask wallet address on Base Sepolia.</p>
                                    </div>

                                    <div className="pt-4 border-t border-blue-50">
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="rounded-full bg-blue-600 px-8 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
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
                            <h2 className="text-2xl font-semibold mb-2 text-slate-900">Revoke Issuer Wallet</h2>
                            <p className="text-sm text-slate-500 mb-8">
                                Revoke an issuer's wallet to permanently block them from issuing new certificates.
                            </p>

                            <form onSubmit={handleRevokeWallet} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Select Mapped Wallet *</label>
                                    <div className="relative">
                                        <select
                                            value={revokeAddress}
                                            onChange={(e) => setRevokeAddress(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-400 transition-all appearance-none cursor-pointer"
                                            required
                                        >
                                            <option value="" disabled className="text-slate-400">-- Select a wallet to revoke --</option>
                                            {issuers.filter(i => i.wallet_address).map(issuer => (
                                                <option key={issuer.id} value={issuer.wallet_address}>
                                                    {issuer.institution_name || issuer.email} — {issuer.wallet_address.substring(0, 10)}...
                                                </option>
                                            ))}
                                        </select>
                                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                                            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-2">Reason for Revocation *</label>
                                    <textarea
                                        value={revokeReason}
                                        onChange={(e) => setRevokeReason(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#eff6ff]/30 border border-blue-100 rounded-2xl text-slate-900 focus:outline-none focus:ring-1 focus:ring-red-400 focus:bg-white transition-all placeholder:text-slate-400 resize-none"
                                        rows="4"
                                        placeholder="Explain why this wallet is being revoked. This will be recorded on-chain."
                                        required
                                    />
                                </div>

                                <div className="pt-4 border-t border-blue-50">
                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="rounded-full bg-red-600 hover:bg-red-500 px-8 py-3.5 text-white font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(220,38,38,0.3)]"
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
