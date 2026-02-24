import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, RefreshCw, ClipboardList, Check, FileText } from 'lucide-react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { walletService } from '../../wallet/walletService';
import { authAPI, walletAuthAPI, certificateAPI } from '../../api';

export default function IssuerDashboard() {
    // Wallet connection state
    const [walletAddress, setWalletAddress] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [isNetworkCorrect, setIsNetworkCorrect] = useState(false);

    // Wallet verification state
    const [walletVerified, setWalletVerified] = useState(false);
    const [walletVerifying, setWalletVerifying] = useState(false);

    // Signing token state
    const [signingToken, setSigningToken] = useState('');

    // Certificate form state
    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [courseName, setCourseName] = useState('');

    // Issued certificates
    const [issuedCerts, setIssuedCerts] = useState([]);
    const [certsLoading, setCertsLoading] = useState(false);

    // UI state
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [issueStep, setIssueStep] = useState('');

    useEffect(() => {
        checkWalletConnection();
        loadIssuedCertificates();
    }, []);

    const loadIssuedCertificates = async () => {
        setCertsLoading(true);
        try {
            const result = await certificateAPI.getIssuedCertificates();
            setIssuedCerts(result.certificates || []);
        } catch (err) {
            console.error('Failed to load certificates:', err);
        } finally {
            setCertsLoading(false);
        }
    };

    const checkWalletConnection = async () => {
        try {
            const address = await walletService.getAddress();
            if (address) {
                setWalletAddress(address);
                setIsConnected(true);
                const correct = await walletService.checkNetwork();
                setIsNetworkCorrect(correct);
            }
        } catch (err) {
            console.error('Error checking wallet:', err);
        }
    };

    const handleConnectWallet = async () => {
        setError('');
        try {
            const address = await walletService.connectWallet();
            setWalletAddress(address);
            setIsConnected(true);
            const correct = await walletService.checkNetwork();
            setIsNetworkCorrect(correct);
            if (correct) await verifyIssuerWallet(address);
        } catch (err) {
            setError(err.message || 'Failed to connect wallet');
        }
    };

    const handleSwitchNetwork = async () => {
        try {
            await walletService.switchToBaseSepolia();
            setIsNetworkCorrect(true);
            if (walletAddress) await verifyIssuerWallet(walletAddress);
        } catch (err) {
            setError('Failed to switch network');
        }
    };

    const verifyIssuerWallet = async (address) => {
        setWalletVerifying(true);
        setError('');
        try {
            const result = await authAPI.verifyIssuerWallet(address);
            if (result.verified) {
                setWalletVerified(true);
                // Don't show success message for auto-verify
            }
        } catch (err) {
            setWalletVerified(false);
            setError(err.response?.data?.error || 'Wallet not mapped. Contact admin.');
        } finally {
            setWalletVerifying(false);
        }
    };

    const handleAuthorize = async () => {
        setError('');
        setMessage('');
        try {
            const challengeResult = await walletAuthAPI.requestChallenge(walletAddress);
            const signature = await walletService.signMessage(challengeResult.message);
            const verifyResult = await walletAuthAPI.verifySignature(walletAddress, signature, challengeResult.message);
            setSigningToken(verifyResult.signingToken);
            sessionStorage.setItem('signingToken', verifyResult.signingToken);
            setMessage('Authorized! Token expires in 5 minutes.');
        } catch (err) {
            setError(err.response?.data?.error || err.message || 'Authorization failed');
        }
    };

    const handleIssueCertificate = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            setIssueStep('Preparing certificate hash...');
            const prepResult = await certificateAPI.prepareCertificate({
                ownerName,
                ownerEmail,
                courseName,
            });

            setIssueStep('Please sign the transaction in MetaMask...');
            const blockchainResult = await walletService.storeCertificateHash(prepResult.hash);

            setIssueStep('Saving certificate record...');
            const result = await certificateAPI.issueCertificate({
                ownerName,
                ownerEmail,
                courseName,
                hash: prepResult.hash,
                txHash: blockchainResult.txHash,
            });

            setMessage(`Certificate issued successfully! ID: ${result.certificateId}`);
            setOwnerName('');
            setOwnerEmail('');
            setCourseName('');
            loadIssuedCertificates();
        } catch (err) {
            const msg = err.response?.data?.error || err.reason || err.message || 'Failed to issue certificate';
            setError(msg);
        } finally {
            setLoading(false);
            setIssueStep('');
        }
    };

    const handleDisconnect = () => {
        setWalletAddress('');
        setIsConnected(false);
        setWalletVerified(false);
        setSigningToken('');
        sessionStorage.removeItem('signingToken');
        setMessage('');
        setError('');
    };

    const truncateHash = (hash) => hash ? `${hash.substring(0, 10)}...${hash.substring(hash.length - 8)}` : '—';

    const [copiedId, setCopiedId] = useState('');
    const copyToClipboard = (text, id) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(''), 1500);
    };

    return (
        <DashboardLayout title="Issuer Dashboard">
            <div className="space-y-8 animate-fade-in-up">

                {/* Header Section */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">Issuer Workspace</h1>
                        <p className="text-[#A1A1A1] text-sm">Create, authorize, and issue blockchain-backed certificates.</p>
                    </div>
                </div>

                {/* Notifications */}
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

                {/* Top Row: Progress Pipeline & Issue Form */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Column: Progress & Setup */}
                    <div className="lg:col-span-5 space-y-6">

                        <div className="bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] relative overflow-hidden">
                            <h2 className="text-lg font-semibold text-white mb-6">Security Workflow</h2>

                            <div className="space-y-6">
                                {/* Step 1: Connect */}
                                <div className={`relative pl-8 ${isConnected ? 'opacity-50' : ''}`}>
                                    <div className={`absolute left-0 top-1 bottom-[-24px] w-px ${isConnected ? 'bg-emerald-500/30' : 'bg-white/[0.08]'}`}></div>
                                    <div className={`absolute left-[-3.5px] top-1.5 w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-white/[0.2]'}`}></div>
                                    <div className="mb-2 font-medium text-sm text-white">1. Connect MetaMask</div>

                                    {!isConnected ? (
                                        <button onClick={handleConnectWallet} className="w-full mt-2 rounded-full bg-white px-6 py-2.5 text-black text-sm font-semibold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                                            Connect Wallet
                                        </button>
                                    ) : (
                                        <div className="text-xs text-[#A1A1A1] mt-1 break-all">
                                            Connected: {walletAddress}
                                            <button onClick={handleDisconnect} className="ml-2 text-red-400 hover:text-red-300">Disconnect</button>
                                        </div>
                                    )}
                                </div>

                                {/* Step 2: Network / Verify */}
                                <div className={`relative pl-8 ${isConnected && walletVerified && isNetworkCorrect ? 'opacity-50' : !isConnected ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <div className={`absolute left-0 top-1 bottom-[-24px] w-px ${walletVerified && isNetworkCorrect ? 'bg-emerald-500/30' : 'bg-white/[0.08]'}`}></div>
                                    <div className={`absolute left-[-3.5px] top-1.5 w-2 h-2 rounded-full ${isConnected && walletVerified && isNetworkCorrect ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-white/[0.2]'}`}></div>
                                    <div className="mb-2 font-medium text-sm text-white">2. Network & Verification</div>

                                    {isConnected && (
                                        <div className="mt-2 space-y-2">
                                            {!isNetworkCorrect ? (
                                                <button onClick={handleSwitchNetwork} className="w-full rounded-full bg-yellow-500/10 border border-yellow-500/20 px-6 py-2.5 text-yellow-500 text-sm font-semibold transition-transform hover:scale-105 active:scale-95">
                                                    Switch to Base Sepolia
                                                </button>
                                            ) : !walletVerified ? (
                                                <button onClick={() => verifyIssuerWallet(walletAddress)} disabled={walletVerifying}
                                                    className="w-full rounded-full bg-white/[0.04] border border-white/[0.08] px-6 py-2.5 text-white text-sm font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50">
                                                    {walletVerifying ? 'Verifying on-chain...' : 'Verify Wallet Mapping'}
                                                </button>
                                            ) : (
                                                <div className="text-xs text-emerald-500 flex items-center"><Check className="w-3 h-3 mr-1" /> On Base Sepolia & Mapped</div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Step 3: Authorize */}
                                <div className={`relative pl-8 ${signingToken ? 'opacity-50' : !walletVerified ? 'opacity-30 pointer-events-none' : ''}`}>
                                    <div className={`absolute left-[-3.5px] top-1.5 w-2 h-2 rounded-full ${signingToken ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-white/[0.2]'}`}></div>
                                    <div className="mb-2 font-medium text-sm text-white">3. Authorize Session</div>

                                    {walletVerified && !signingToken && (
                                        <button onClick={handleAuthorize} className="w-full mt-2 bg-gradient-to-r from-purple-500/20 to-indigo-500/20 border border-purple-500/30 rounded-full px-6 py-2.5 text-purple-300 text-sm font-semibold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(168,85,247,0.15)]">
                                            Sign to Authorize
                                        </button>
                                    )}
                                    {signingToken && (
                                        <div className="text-xs text-emerald-500 mt-1 flex items-center"><Check className="w-3 h-3 mr-1" /> Session active (expires in 5m)</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Issue Form */}
                    <div className="lg:col-span-7">
                        <div className={`bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] h-full transition-all duration-300 ${!signingToken ? 'opacity-40 pointer-events-none grayscale-[0.5]' : ''}`}>

                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-xl font-semibold text-white">Issue Certificate</h2>
                                {!signingToken && (
                                    <span className="text-xs bg-white/[0.08] border border-white/[0.1] px-3 py-1 rounded-full text-[#A1A1A1]">
                                        Requires Authorization
                                    </span>
                                )}
                            </div>

                            <form onSubmit={handleIssueCertificate} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Student Name *</label>
                                        <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                            placeholder="Jane Doe" required />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Student Email</label>
                                        <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                                            className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                            placeholder="jane@example.com" />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-2">Course / Certificate Name *</label>
                                    <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)}
                                        className="w-full px-4 py-3 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700"
                                        placeholder="Advanced React Development" required />
                                </div>

                                {issueStep && (
                                    <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl p-4 text-sm text-[#A1A1A1] flex items-center space-x-3">
                                        <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></div>
                                        <span className="font-mono text-xs">{issueStep}</span>
                                    </div>
                                )}

                                <div className="pt-4 border-t border-white/[0.08]">
                                    <button type="submit" disabled={loading}
                                        className="w-full rounded-full bg-white px-6 py-4 text-black font-semibold transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.15)] flex justify-center items-center">
                                        {loading ? 'Processing Transaction...' : 'Mint onto Blockchain'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Issued Certificates Ledger */}
                <div className="bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                    <div className="flex items-center justify-between mb-6 pb-6 border-b border-white/[0.08]">
                        <div>
                            <h2 className="text-xl font-semibold text-white">Issued Ledger</h2>
                            <p className="text-[#A1A1A1] text-sm mt-1">Historically verifiable records on Base Sepolia</p>
                        </div>
                        <button onClick={loadIssuedCertificates} className="text-sm text-[#A1A1A1] hover:text-white transition-colors flex items-center gap-1.5 focus:outline-none">
                            <RefreshCw className="mr-1 w-4 h-4" /> Refresh Ledger
                        </button>
                    </div>

                    {certsLoading ? (
                        <div className="text-center py-12 text-[#A1A1A1]">
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4"></div>
                                <p>Loading ledger...</p>
                            </div>
                        </div>
                    ) : issuedCerts.length === 0 ? (
                        <div className="text-center py-16 text-[#A1A1A1]">
                            <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                <FileText className="w-6 h-6 text-white stroke-[1.5]" />
                            </div>
                            <p className="text-white font-medium mb-1">No certificates issued</p>
                            <p className="text-sm">Use the form above to mint your first credential.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[900px]">
                                <thead>
                                    <tr className="border-b border-white/[0.08] bg-[#111111]/30">
                                        <th className="px-6 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Recipient</th>
                                        <th className="px-6 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Course</th>
                                        <th className="px-6 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Certificate Hash</th>
                                        <th className="px-6 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">TX Hash</th>
                                        <th className="px-6 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Issued On</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {issuedCerts.map((cert) => (
                                        <tr key={cert.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="form-medium text-white">{cert.recipientName}</div>
                                                <div className="text-xs text-[#A1A1A1] mt-1">{cert.recipientEmail || '—'}</div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-[#A1A1A1]">{cert.courseName}</td>
                                            <td className="px-6 py-5 whitespace-nowrap font-mono text-xs">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[#A1A1A1]">{truncateHash(cert.hash)}</span>
                                                    <button onClick={() => copyToClipboard(cert.hash, `hash-${cert.id}`)}
                                                        className="text-[#A1A1A1] hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Copy full hash">
                                                        {copiedId === `hash-${cert.id}` ? <Check className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap font-mono text-xs">
                                                {cert.txHash ? (
                                                    <div className="flex items-center gap-2">
                                                        <a href={`https://sepolia.basescan.org/tx/${cert.txHash}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="text-purple-400 hover:text-purple-300 transition-colors" title={cert.txHash}>
                                                            {truncateHash(cert.txHash)}
                                                        </a>
                                                        <button onClick={() => copyToClipboard(cert.txHash, `tx-${cert.id}`)}
                                                            className="text-[#A1A1A1] hover:text-white transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100" title="Copy TX hash">
                                                            {copiedId === `tx-${cert.id}` ? <Check className="w-4 h-4" /> : <ClipboardList className="w-4 h-4" />}
                                                        </button>
                                                    </div>
                                                ) : <span className="text-[#A1A1A1]">Pending...</span>}
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap text-sm text-[#A1A1A1]">
                                                {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </DashboardLayout>
    );
}
