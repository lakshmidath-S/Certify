import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verificationAPI } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';

export default function VerifierDashboard() {
    const navigate = useNavigate();
    const [hashes, setHashes] = useState('');
    const [results, setResults] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setResults([]);
        setSummary(null);
        setLoading(true);

        try {
            const hashArray = hashes
                .split('\n')
                .map(h => h.trim())
                .filter(h => h.length > 0);

            if (hashArray.length === 0) {
                setError('Please enter at least one hash');
                return;
            }

            const result = await verificationAPI.verifyBulk(hashArray);
            setResults(result.results);
            setSummary(result.summary);
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center">
                            <h1 className="text-2xl font-bold text-blue-600">CERTIFY</h1>
                            <span className="ml-4 text-gray-600">Verifier Dashboard</span>
                        </div>
                        <div className="flex items-center">
                            <button
                                onClick={() => navigate('/')}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
                            >
                                ← Back to Home
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                <div className="space-y-6">
                    <div className="bg-white shadow rounded-lg p-6">
                        <h2 className="text-xl font-semibold mb-4">Bulk Certificate Verification</h2>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleVerify} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Certificate Hashes (one per line)
                                </label>
                                <textarea
                                    value={hashes}
                                    onChange={(e) => setHashes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows="10"
                                    placeholder="Enter certificate hashes, one per line..."
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Verifying...' : 'Verify Certificates'}
                            </button>
                        </form>
                    </div>

                    {summary && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Verification Summary</h3>
                            <div className="grid grid-cols-4 gap-4">
                                <div className="bg-gray-50 p-4 rounded">
                                    <div className="text-2xl font-bold text-gray-900">{summary.total}</div>
                                    <div className="text-sm text-gray-600">Total</div>
                                </div>
                                <div className="bg-green-50 p-4 rounded">
                                    <div className="text-2xl font-bold text-green-600">{summary.valid}</div>
                                    <div className="text-sm text-gray-600">Valid</div>
                                </div>
                                <div className="bg-red-50 p-4 rounded">
                                    <div className="text-2xl font-bold text-red-600">{summary.invalid}</div>
                                    <div className="text-sm text-gray-600">Invalid</div>
                                </div>
                                <div className="bg-yellow-50 p-4 rounded">
                                    <div className="text-2xl font-bold text-yellow-600">{summary.notFound}</div>
                                    <div className="text-sm text-gray-600">Not Found</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {results.length > 0 && (
                        <div className="bg-white shadow rounded-lg p-6">
                            <h3 className="text-lg font-semibold mb-4">Verification Results</h3>

                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Hash
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Valid
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Message
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Certificate Info
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {results.map((result, index) => (
                                            <tr key={index}>
                                                <td className="px-6 py-4 text-sm font-mono text-gray-900">
                                                    {result.hash.substring(0, 16)}...
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge status={result.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {result.valid ? (
                                                        <span className="text-green-600">✓</span>
                                                    ) : (
                                                        <span className="text-red-600">✗</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {result.message}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {result.certificate && (
                                                        <div>
                                                            <div>{result.certificate.recipientName}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {result.certificate.courseName}
                                                            </div>
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
