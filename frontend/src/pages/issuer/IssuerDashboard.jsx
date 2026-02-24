import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { walletService } from '../../wallet/walletService';
import { authAPI, walletAuthAPI, certificateAPI } from '../../api';

const MONTHS = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' },
];

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
    const [department, setDepartment] = useState('');
    const [issueMonth, setIssueMonth] = useState('');
    const [issueYear, setIssueYear] = useState('');
    const [graduationMonth, setGraduationMonth] = useState('');
    const [graduationYear, setGraduationYear] = useState('');

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
                setMessage('✅ Wallet verified!');
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
            setMessage('✅ Authorized! Token expires in 5 minutes.');
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
            const certData = {
                ownerName,
                ownerEmail,
                courseName,
                department,
                issueMonth,
                issueYear,
                graduationMonth,
                graduationYear,
            };

            setIssueStep('Preparing certificate hash...');
            const prepResult = await certificateAPI.prepareCertificate(certData);

            setIssueStep('Confirm the blockchain transaction in MetaMask...');
            const blockchainResult = await walletService.storeCertificateHash(prepResult.hash);

            setIssueStep('Saving certificate record...');
            const result = await certificateAPI.issueCertificate({
                ...certData,
                hash: prepResult.hash,
                txHash: blockchainResult.txHash,
            });

            setMessage(`✅ Certificate issued! ID: ${result.certificateId}`);
            setOwnerName('');
            setOwnerEmail('');
            setCourseName('');
            setDepartment('');
            setIssueMonth('');
            setIssueYear('');
            setGraduationMonth('');
            setGraduationYear('');
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

    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear + 5; y >= currentYear - 10; y--) {
        years.push(y);
    }

    const inputClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500";
    const selectClass = "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white";

    return (
        <DashboardLayout title="Issuer Dashboard">
            <div className="space-y-6">
                {message && (
                    <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>
                )}
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>
                )}

                {/* Welcome + Progress */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-2">Welcome, Issuer</h2>
                    <p className="text-sm text-gray-500">Connect & verify your wallet, authorize, then issue certificates.</p>
                    <div className="mt-4 flex items-center space-x-4">
                        {[
                            { n: 1, label: 'Connect', done: isConnected },
                            { n: 2, label: 'Verify', done: walletVerified },
                            { n: 3, label: 'Authorize', done: !!signingToken },
                            { n: 4, label: 'Issue', done: false },
                        ].map((s, i) => (
                            <div key={s.n} className="flex items-center space-x-2">
                                {i > 0 && <div className="w-6 h-px bg-gray-300"></div>}
                                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${s.done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>{s.n}</span>
                                <span className={`text-sm ${s.done ? 'text-green-600' : 'text-gray-400'}`}>{s.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Connect */}
                <div className="bg-white shadow rounded-lg p-6">
                    <h2 className="text-lg font-semibold mb-3">Step 1: Connect MetaMask</h2>
                    {!isConnected ? (
                        <button onClick={handleConnectWallet} className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 font-medium">🦊 Connect MetaMask</button>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-md">
                                <div>
                                    <p className="text-sm text-gray-600">Connected:</p>
                                    <p className="font-mono text-sm">{walletAddress}</p>
                                </div>
                                <button onClick={handleDisconnect} className="text-sm text-red-600 hover:text-red-800">Disconnect</button>
                            </div>
                            {!isNetworkCorrect && (
                                <button onClick={handleSwitchNetwork} className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700">⚠️ Switch to Base Sepolia</button>
                            )}
                            {isNetworkCorrect && <p className="text-green-600 text-sm">✓ Connected to Base Sepolia</p>}
                        </div>
                    )}
                </div>

                {/* Step 2: Verify */}
                {isConnected && isNetworkCorrect && !walletVerified && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-3">Step 2: Verify Your Wallet</h2>
                        <button onClick={() => verifyIssuerWallet(walletAddress)} disabled={walletVerifying}
                            className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 font-medium">
                            {walletVerifying ? 'Verifying...' : '🔍 Verify Wallet'}
                        </button>
                    </div>
                )}

                {walletVerified && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
                        <span className="text-2xl">✅</span>
                        <div>
                            <p className="font-medium text-green-800">Wallet Verified</p>
                            <p className="text-sm text-green-600">Mapped to your issuer account.</p>
                        </div>
                    </div>
                )}

                {/* Step 3: Authorize */}
                {walletVerified && !signingToken && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-3">Step 3: Authorize</h2>
                        <button onClick={handleAuthorize} className="w-full bg-purple-600 text-white py-2.5 px-4 rounded-md hover:bg-purple-700 font-medium">✍️ Authorize with MetaMask</button>
                    </div>
                )}

                {signingToken && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
                        <span className="text-2xl">🔑</span>
                        <div>
                            <p className="font-medium text-blue-800">Authorized</p>
                            <p className="text-sm text-blue-600">Token expires in 5 minutes.</p>
                        </div>
                    </div>
                )}

                {/* Step 4: Issue Certificate */}
                {signingToken && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-lg font-semibold mb-3">Step 4: Issue Certificate</h2>
                        <form onSubmit={handleIssueCertificate} className="space-y-4">
                            {/* Student Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name *</label>
                                <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
                                    className={inputClass} required placeholder="Full name of the student" />
                            </div>

                            {/* Student Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Student Email *</label>
                                <input type="email" value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
                                    className={inputClass} required placeholder="student@example.com" />
                            </div>

                            {/* Course Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Course Name *</label>
                                <input type="text" value={courseName} onChange={(e) => setCourseName(e.target.value)}
                                    className={inputClass} required placeholder="e.g. B.Tech Computer Science" />
                            </div>

                            {/* Department */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Department *</label>
                                <input type="text" value={department} onChange={(e) => setDepartment(e.target.value)}
                                    className={inputClass} required placeholder="e.g. Computer Science and Engineering" />
                            </div>

                            {/* Certificate Issue Date (Month & Year) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Issue Date *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={issueMonth} onChange={(e) => setIssueMonth(e.target.value)}
                                        className={selectClass} required>
                                        <option value="">Month</option>
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <select value={issueYear} onChange={(e) => setIssueYear(e.target.value)}
                                        className={selectClass} required>
                                        <option value="">Year</option>
                                        {years.map(y => (
                                            <option key={y} value={String(y)}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Graduation Date (Month & Year) */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Date *</label>
                                <div className="grid grid-cols-2 gap-3">
                                    <select value={graduationMonth} onChange={(e) => setGraduationMonth(e.target.value)}
                                        className={selectClass} required>
                                        <option value="">Month</option>
                                        {MONTHS.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                    <select value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)}
                                        className={selectClass} required>
                                        <option value="">Year</option>
                                        {years.map(y => (
                                            <option key={y} value={String(y)}>{y}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {issueStep && (
                                <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700 flex items-center space-x-2">
                                    <span className="animate-spin">⏳</span>
                                    <span>{issueStep}</span>
                                </div>
                            )}
                            <button type="submit" disabled={loading}
                                className="w-full bg-blue-600 text-white py-2.5 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium">
                                {loading ? 'Processing...' : '📜 Issue Certificate'}
                            </button>
                        </form>
                    </div>
                )}

                {/* Issued Certificates Table */}
                <div className="bg-white shadow rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Issued Certificates</h2>
                        <button onClick={loadIssuedCertificates} className="text-sm text-blue-600 hover:text-blue-800">↻ Refresh</button>
                    </div>

                    {certsLoading ? (
                        <p className="text-center text-gray-500 py-4">Loading...</p>
                    ) : issuedCerts.length === 0 ? (
                        <p className="text-center text-gray-400 py-4">No certificates issued yet</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b text-left text-gray-500 uppercase text-xs">
                                        <th className="py-3 px-2">Recipient</th>
                                        <th className="py-3 px-2">Email</th>
                                        <th className="py-3 px-2">Course</th>
                                        <th className="py-3 px-2">Dept</th>
                                        <th className="py-3 px-2">Certificate Hash</th>
                                        <th className="py-3 px-2">TX Hash</th>
                                        <th className="py-3 px-2">Issued</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {issuedCerts.map((cert) => (
                                        <tr key={cert.id} className="border-b hover:bg-gray-50">
                                            <td className="py-3 px-2 font-medium">{cert.recipientName}</td>
                                            <td className="py-3 px-2 text-gray-500">{cert.recipientEmail || '—'}</td>
                                            <td className="py-3 px-2">{cert.courseName}</td>
                                            <td className="py-3 px-2 text-gray-500">{cert.additionalInfo?.department || '—'}</td>
                                            <td className="py-3 px-2 font-mono text-xs">
                                                <div className="flex items-center space-x-1">
                                                    <span title={cert.hash}>{truncateHash(cert.hash)}</span>
                                                    <button onClick={() => copyToClipboard(cert.hash, `hash-${cert.id}`)}
                                                        className="text-gray-400 hover:text-blue-600 shrink-0" title="Copy full hash">
                                                        {copiedId === `hash-${cert.id}` ? '✓' : '📋'}
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="py-3 px-2 font-mono text-xs">
                                                {cert.txHash ? (
                                                    <div className="flex items-center space-x-1">
                                                        <a href={`https://sepolia.basescan.org/tx/${cert.txHash}`}
                                                            target="_blank" rel="noopener noreferrer"
                                                            className="text-blue-600 hover:text-blue-800" title={cert.txHash}>
                                                            {truncateHash(cert.txHash)}
                                                        </a>
                                                        <button onClick={() => copyToClipboard(cert.txHash, `tx-${cert.id}`)}
                                                            className="text-gray-400 hover:text-blue-600 shrink-0" title="Copy TX hash">
                                                            {copiedId === `tx-${cert.id}` ? '✓' : '📋'}
                                                        </button>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                            <td className="py-3 px-2 text-gray-500">
                                                {cert.createdAt ? new Date(cert.createdAt).toLocaleDateString() : '—'}
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
