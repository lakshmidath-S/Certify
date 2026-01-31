import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { walletService } from '../../wallet/walletService';
import { walletAuthAPI, certificateAPI } from '../../api';

export default function IssuerDashboard() {
    const [walletAddress, setWalletAddress] = useState('');
    const [isConnected, setIsConnected] = useState(false);
    const [challengeMessage, setChallengeMessage] = useState('');
    const [signingToken, setSigningToken] = useState('');
    const [isNetworkCorrect, setIsNetworkCorrect] = useState(false);

    const [ownerName, setOwnerName] = useState('');
    const [ownerEmail, setOwnerEmail] = useState('');
    const [courseName, setCourseName] = useState('');
    const [ownerId, setOwnerId] = useState('');
    const [issuerPrivateKey, setIssuerPrivateKey] = useState('');

    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkWalletConnection();
        checkNetwork();
    }, []);

    const checkWalletConnection = async () => {
        try {
            const address = await walletService.getAddress();
            if (address) {
                setWalletAddress(address);
                setIsConnected(true);
            }
        } catch (err) {
            console.error('Error checking wallet:', err);
        }
    };

    const checkNetwork = async () => {
        try {
            const correct = await walletService.checkNetwork();
            setIsNetworkCorrect(correct);
        } catch (err) {
            console.error('Error checking network:', err);
        }
    };

    const handleConnectWallet = async () => {
        try {
            const address = await walletService.connectWallet();
            setWalletAddress(address);
            setIsConnected(true);
            await checkNetwork();
        } catch (err) {
            setError(err.message || 'Failed to connect wallet');
        }
    };

    const handleSwitchNetwork = async () => {
        try {
            await walletService.switchToBaseSepolia();
            setIsNetworkCorrect(true);
        } catch (err) {
            setError('Failed to switch network');
        }
    };

    const handleRequestChallenge = async () => {
        setError('');
        setMessage('');

        try {
            const result = await walletAuthAPI.requestChallenge(walletAddress);
            setChallengeMessage(result.message);
            setMessage('Challenge received! Please sign the message.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to request challenge');
        }
    };

    const handleSignMessage = async () => {
        setError('');
        setMessage('');

        try {
            const signature = await walletService.signMessage(challengeMessage);

            const result = await walletAuthAPI.verifySignature(
                walletAddress,
                signature,
                challengeMessage
            );

            setSigningToken(result.signingToken);
            sessionStorage.setItem('signingToken', result.signingToken);
            setMessage('Signature verified! You can now issue certificates.');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to verify signature');
        }
    };

    const handleIssueCertificate = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const result = await certificateAPI.issueCertificate({
                ownerName,
                ownerEmail,
                courseName,
                ownerId,
                issuerPrivateKey,
            });

            setMessage(`Certificate issued successfully! ID: ${result.certificateId}, Hash: ${result.hash}`);
            setOwnerName('');
            setOwnerEmail('');
            setCourseName('');
            setOwnerId('');
            setIssuerPrivateKey('');
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to issue certificate');
        } finally {
            setLoading(false);
        }
    };

    return (
        <DashboardLayout title="Issuer Dashboard">
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
                    <h2 className="text-xl font-semibold mb-4">Wallet Connection</h2>

                    {!isConnected ? (
                        <button
                            onClick={handleConnectWallet}
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700"
                        >
                            Connect MetaMask
                        </button>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm text-gray-600">Connected Address:</p>
                                <p className="font-mono text-sm">{walletAddress}</p>
                            </div>

                            {!isNetworkCorrect && (
                                <button
                                    onClick={handleSwitchNetwork}
                                    className="w-full bg-yellow-600 text-white py-2 px-4 rounded-md hover:bg-yellow-700"
                                >
                                    Switch to Base Sepolia
                                </button>
                            )}

                            {isNetworkCorrect && (
                                <div className="text-green-600 text-sm">
                                    ✓ Connected to Base Sepolia
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {isConnected && isNetworkCorrect && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Wallet Signature Authorization</h2>

                        <div className="space-y-4">
                            <button
                                onClick={handleRequestChallenge}
                                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
                            >
                                Step 1: Request Challenge
                            </button>

                            {challengeMessage && (
                                <>
                                    <div className="bg-gray-50 p-4 rounded border">
                                        <p className="text-sm text-gray-600 mb-2">Message to sign:</p>
                                        <p className="text-sm font-mono break-all">{challengeMessage}</p>
                                    </div>

                                    <button
                                        onClick={handleSignMessage}
                                        className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700"
                                    >
                                        Step 2: Sign with MetaMask
                                    </button>
                                </>
                            )}

                            {signingToken && (
                                <div className="bg-green-50 p-4 rounded border border-green-200">
                                    <p className="text-green-700 font-medium">✓ Authorized to issue certificates</p>
                                    <p className="text-xs text-gray-600 mt-1">Token expires in 5 minutes</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {signingToken && (
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Issue Certificate</h2>

                        <form onSubmit={handleIssueCertificate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Student Name
                                </label>
                                <input
                                    type="text"
                                    value={ownerName}
                                    onChange={(e) => setOwnerName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Student Email
                                </label>
                                <input
                                    type="email"
                                    value={ownerEmail}
                                    onChange={(e) => setOwnerEmail(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Course Name
                                </label>
                                <input
                                    type="text"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Owner ID (UUID)
                                </label>
                                <input
                                    type="text"
                                    value={ownerId}
                                    onChange={(e) => setOwnerId(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Issuer Private Key
                                </label>
                                <input
                                    type="password"
                                    value={issuerPrivateKey}
                                    onChange={(e) => setIssuerPrivateKey(e.target.value)}
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
                                {loading ? 'Issuing...' : 'Issue Certificate'}
                            </button>
                        </form>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
