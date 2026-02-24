import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
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
        <div className="min-h-screen text-white font-sans selection:bg-white/30">
            {/* Background elements handled via index.css globally */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden h-full">
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-white/[0.02] rounded-full blur-[100px]"></div>
            </div>

            {/* Floating Navbar */}
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
                <div className="mx-auto flex items-center justify-between rounded-full border border-white/[0.08] bg-[#0A0A0A]/60 px-6 py-3 backdrop-blur-md shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3 cursor-pointer">
                            <div className="h-6 w-6 rounded-full bg-white flex items-center justify-center">
                                <span className="text-black font-bold text-xs">C</span>
                            </div>
                            <span className="text-lg font-semibold tracking-tight">CERTIFY</span>
                        </Link>
                        <span className="text-[#A1A1A1] mx-2">/</span>
                        <span className="text-sm font-medium text-[#A1A1A1]">Verifier</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm font-medium text-[#A1A1A1] hover:text-white transition-colors flex items-center"
                        >
                            <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to Home
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 mx-auto max-w-6xl px-4 pt-48 pb-24">
                <div className="text-center mb-12 animate-fade-in-up">
                    <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-[#111111]/40 px-3 py-1.5 text-sm text-[#A1A1A1] mb-6 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                        Blockchain Verification Engine
                    </div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-4 text-white">
                        Bulk Certificate Verification
                    </h1>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>

                    {/* Input Section */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm mb-6">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleVerify} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-[#A1A1A1] mb-3">
                                        Certificate Hashes
                                    </label>
                                    <textarea
                                        value={hashes}
                                        onChange={(e) => setHashes(e.target.value)}
                                        className="w-full px-4 py-4 bg-[#0A0A0A] border border-white/[0.08] rounded-2xl text-white focus:outline-none focus:ring-1 focus:ring-white/20 transition-all placeholder:text-zinc-700 font-mono text-xs resize-none"
                                        rows="12"
                                        placeholder="Enter certificate hashes here...&#10;One per line.&#10;e.g. 0xabc...&#10;0xdef..."
                                        required
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full rounded-full bg-white px-6 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                >
                                    {loading ? 'Verifying...' : 'Verify Certificates'}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="lg:col-span-8 space-y-8">
                        {summary && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-br from-[#111111] to-[#0A0A0A] p-6 rounded-[24px] border border-white/[0.08] text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                                    <div className="text-3xl font-semibold text-white mb-1">{summary.total}</div>
                                    <div className="text-sm text-[#A1A1A1]">Total</div>
                                </div>
                                <div className="bg-emerald-500/5 p-6 rounded-[24px] border border-emerald-500/20 text-center shadow-[inset_0_1px_0_rgba(16,185,129,0.1)]">
                                    <div className="text-3xl font-semibold text-emerald-400 mb-1">{summary.valid}</div>
                                    <div className="text-sm text-emerald-500/70">Valid</div>
                                </div>
                                <div className="bg-red-500/5 p-6 rounded-[24px] border border-red-500/20 text-center shadow-[inset_0_1px_0_rgba(239,68,68,0.1)]">
                                    <div className="text-3xl font-semibold text-red-400 mb-1">{summary.invalid}</div>
                                    <div className="text-sm text-red-500/70">Invalid</div>
                                </div>
                                <div className="bg-yellow-500/5 p-6 rounded-[24px] border border-yellow-500/20 text-center shadow-[inset_0_1px_0_rgba(245,158,11,0.1)]">
                                    <div className="text-3xl font-semibold text-yellow-400 mb-1">{summary.notFound}</div>
                                    <div className="text-sm text-yellow-500/70">Not Found</div>
                                </div>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] overflow-hidden">
                                <h3 className="text-lg font-semibold mb-6 text-white">Verification Results</h3>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-white/[0.08]">
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Hash</th>
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Result</th>
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {results.map((result, index) => (
                                                <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-4 py-4 text-xs font-mono text-[#A1A1A1]">
                                                        {result.hash.substring(0, 16)}...
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        <StatusBadge status={result.status} />
                                                    </td>
                                                    <td className="px-4 py-4 whitespace-nowrap">
                                                        {result.valid ? (
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/20">VALID</span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-medium border border-red-500/20">INVALID</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-[#A1A1A1]">
                                                        <div className="font-medium text-white mb-1">{result.message}</div>
                                                        {result.certificate && (
                                                            <div className="text-xs">
                                                                <span className="text-white">{result.certificate.recipientName}</span> • {result.certificate.courseName}
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
                </div>
            </main>
        </div>
    );
}
