import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { verificationAPI } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';

export default function VerifierDashboard() {
    const navigate = useNavigate();
    const fileInputRef = useRef(null);
    const [files, setFiles] = useState([]);
    const [results, setResults] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    const handleFiles = (newFiles) => {
        const pdfFiles = Array.from(newFiles).filter(
            f => f.type === 'application/pdf'
        );
        if (pdfFiles.length === 0) {
            setError('Please upload PDF files only');
            return;
        }
        setFiles(prev => [...prev, ...pdfFiles]);
        setError('');
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragActive(false);
        handleFiles(e.dataTransfer.files);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        setDragActive(true);
    };

    const handleDragLeave = () => {
        setDragActive(false);
    };

    const handleFileInput = (e) => {
        handleFiles(e.target.files);
        e.target.value = '';
    };

    const removeFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setResults([]);
        setSummary(null);

        if (files.length === 0) {
            setError('Please upload at least one certificate PDF');
            return;
        }

        setLoading(true);

        try {
            const allResults = [];

            for (const file of files) {
                try {
                    const response = await verificationAPI.verifyUpload(file);
                    allResults.push({
                        fileName: file.name,
                        ...response.verification
                    });
                } catch (err) {
                    allResults.push({
                        fileName: file.name,
                        status: 'ERROR',
                        exists: false,
                        valid: false,
                        message: err.response?.data?.error || 'Verification failed'
                    });
                }
            }

            setResults(allResults);
            setSummary({
                total: allResults.length,
                valid: allResults.filter(r => r.valid).length,
                invalid: allResults.filter(r => !r.valid && r.exists).length,
                notFound: allResults.filter(r => !r.exists && r.status !== 'ERROR').length,
                errors: allResults.filter(r => r.status === 'ERROR').length
            });
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
                        Certificate Verification
                    </h1>
                    <p className="text-[#A1A1A1] text-sm">
                        Upload certificate PDFs to verify their authenticity against the blockchain.
                    </p>
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
                                        Upload Certificates
                                    </label>
                                    {/* Drag & Drop Upload Area */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive
                                            ? 'border-white/30 bg-white/[0.04]'
                                            : 'border-white/[0.08] hover:border-white/20 hover:bg-white/[0.02]'
                                            }`}
                                    >
                                        <input
                                            ref={fileInputRef}
                                            type="file"
                                            accept=".pdf,application/pdf"
                                            multiple
                                            onChange={handleFileInput}
                                            className="hidden"
                                        />
                                        <div className="text-4xl mb-3">📄</div>
                                        <p className="text-white font-medium text-sm">
                                            {dragActive ? 'Drop PDFs here' : 'Drag & drop certificate PDFs here'}
                                        </p>
                                        <p className="text-xs text-[#A1A1A1] mt-1">
                                            or click to browse files
                                        </p>
                                    </div>
                                </div>

                                {/* Selected Files List */}
                                {files.length > 0 && (
                                    <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-4">
                                        <h4 className="text-sm font-medium text-[#A1A1A1] mb-2">
                                            Selected Certificates ({files.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {files.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white/[0.03] px-3 py-2 rounded-xl border border-white/[0.06]">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-red-400">📄</span>
                                                        <span className="text-sm text-white">{file.name}</span>
                                                        <span className="text-xs text-[#A1A1A1]">
                                                            ({(file.size / 1024).toFixed(1)} KB)
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                        className="text-[#A1A1A1] hover:text-red-400 text-sm transition-colors"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={loading || files.length === 0}
                                    className="w-full rounded-full bg-white px-6 py-3.5 text-black font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
                                >
                                    {loading ? 'Verifying...' : `Verify Certificate${files.length !== 1 ? 's' : ''}`}
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
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">File</th>
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Result</th>
                                                <th className="px-4 py-3 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/[0.04]">
                                            {results.map((result, index) => (
                                                <tr key={index} className="hover:bg-white/[0.02] transition-colors">
                                                    <td className="px-4 py-4 text-sm text-white">
                                                        <div className="flex items-center space-x-2">
                                                            <span>📄</span>
                                                            <span className="font-medium">{result.fileName}</span>
                                                        </div>
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
                                                        {result.certificateData && !result.certificate && (
                                                            <div className="text-xs">
                                                                <span className="text-white">{result.certificateData.ownerName}</span> • {result.certificateData.courseName}
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
