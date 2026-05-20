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
                invalid: allResults.filter(r => !r.valid).length,
            });
        } catch (err) {
            setError(err.response?.data?.error || 'Verification failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-slate-800 font-sans selection:bg-blue-600/30">
            {/* Background elements handled via index.css globally */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden h-full">
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            {/* Floating Navbar */}
            <nav className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-5xl px-4">
                <div className="mx-auto flex items-center justify-between rounded-full border border-blue-100 bg-white/90 px-6 py-3 backdrop-blur-md shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
                    <div className="flex items-center gap-3">
                        <Link to="/" className="flex items-center gap-3 cursor-pointer">
                            <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center">
                                <span className="text-white font-bold text-xs">C</span>
                            </div>
                            <span className="text-lg font-semibold tracking-tight text-slate-900">CERTIFY</span>
                        </Link>
                        <span className="text-blue-300 mx-2">/</span>
                        <span className="text-sm font-medium text-slate-600">Verifier</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors flex items-center"
                        >
                            <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to Home
                        </button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 mx-auto max-w-6xl px-4 pt-48 pb-24">
                <div className="text-center mb-12 animate-fade-in-up">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm text-blue-700 mb-6 backdrop-blur-md shadow-sm font-medium">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 mr-2"></span>
                        Blockchain Verification Engine
                    </div>
                    <h1 className="text-4xl md:text-5xl font-semibold tracking-tighter mb-4 text-slate-900">
                        Certificate Verification
                    </h1>
                    <p className="text-slate-500 text-sm">
                        Upload certificate PDFs to verify their authenticity against the blockchain.
                    </p>
                </div>

                <div className="flex flex-col items-center gap-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>

                    {/* Upload Card — always centered */}
                    <div className="w-full max-w-lg">
                        <div className="bg-white rounded-[28px] border-2 border-amber-400 shadow-[0_8px_32px_rgb(245,158,11,0.18)] p-8 overflow-hidden">
                            {error && (
                                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm mb-6">
                                    {error}
                                </div>
                            )}

                            <form onSubmit={handleVerify} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 mb-3">
                                        Upload Certificates
                                    </label>
                                    {/* Drag & Drop Upload Area */}
                                    <div
                                        onDrop={handleDrop}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${dragActive
                                            ? 'border-blue-400 bg-[#eff6ff]'
                                            : 'border-blue-100 hover:border-blue-300 hover:bg-[#eff6ff]/40'
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
                                        <p className="text-slate-700 font-medium text-sm">
                                            {dragActive ? 'Drop PDFs here' : 'Drag & drop certificate PDFs here'}
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1">
                                            or click to browse files
                                        </p>
                                    </div>
                                </div>

                                {/* Selected Files List */}
                                {files.length > 0 && (
                                    <div className="bg-[#eff6ff]/40 border border-blue-100 rounded-2xl p-4">
                                        <h4 className="text-sm font-medium text-slate-600 mb-2">
                                            Selected Certificates ({files.length})
                                        </h4>
                                        <div className="space-y-2">
                                            {files.map((file, index) => (
                                                <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-blue-50">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-red-400">📄</span>
                                                        <span className="text-sm text-slate-700">{file.name}</span>
                                                        <span className="text-xs text-slate-400">
                                                            ({(file.size / 1024).toFixed(1)} KB)
                                                        </span>
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                        className="text-slate-400 hover:text-red-500 text-sm transition-colors"
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
                                    className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                                >
                                    {loading ? 'Verifying...' : `Verify Certificate${files.length !== 1 ? 's' : ''}`}
                                </button>
                            </form>
                        </div>
                    </div>

                    {/* Results Section */}
                    <div className="w-full space-y-8">
                        {summary && (
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-white p-6 rounded-[24px] border border-blue-50 text-center shadow-[0_4px_20px_rgb(13,110,253,0.05)]">
                                    <div className="text-3xl font-semibold text-slate-900 mb-1">{summary.total}</div>
                                    <div className="text-sm text-slate-500">Total</div>
                                </div>
                                <div className="bg-emerald-50 p-6 rounded-[24px] border border-emerald-200 text-center">
                                    <div className="text-3xl font-semibold text-emerald-600 mb-1">{summary.valid}</div>
                                    <div className="text-sm text-emerald-700">Valid</div>
                                </div>
                                <div className="bg-red-50 p-6 rounded-[24px] border border-red-200 text-center">
                                    <div className="text-3xl font-semibold text-red-600 mb-1">{summary.invalid}</div>
                                    <div className="text-sm text-red-700">Invalid</div>
                                </div>
                            </div>
                        )}

                        {results.length > 0 && (
                            <div className="bg-white rounded-[28px] border-2 border-amber-400 shadow-[0_8px_32px_rgb(245,158,11,0.18)] p-8 overflow-hidden">
                                <h3 className="text-lg font-semibold mb-6 text-slate-900">Verification Results</h3>

                                <div className="overflow-x-auto">
                                    <table className="min-w-full text-left border-collapse">
                                        <thead>
                                            <tr className="border-b border-blue-50 bg-[#eff6ff]/40">
                                                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">File</th>
                                                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                                                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Result</th>
                                                <th className="px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wider">Details</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-blue-50">
                                            {results.map((result, index) => (
                                                <tr key={index} className="hover:bg-[#eff6ff]/30 transition-colors">
                                                    <td className="px-4 py-4 text-sm text-slate-900">
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
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">VALID</span>
                                                        ) : (
                                                            <span className="inline-flex items-center px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-200">INVALID</span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4 text-sm text-slate-500">
                                                        <div className="font-medium text-slate-900 mb-1">{result.message}</div>
                                                        {result.certificate && result.certificate.recipientName ? (
                                                            <div className="text-xs">
                                                                <span className="text-slate-700">{result.certificate.recipientName}</span> • {result.certificate.courseName}
                                                                {result.certificate.certificateNumber && (
                                                                    <div className="text-slate-400 mt-0.5">ID: {result.certificate.certificateNumber}</div>
                                                                )}
                                                            </div>
                                                        ) : result.certificateData ? (
                                                            <div className="text-xs">
                                                                <span className="text-slate-700">{result.certificateData.ownerName}</span> • {result.certificateData.courseName}
                                                                <div className="text-emerald-600 mt-0.5 font-medium">Verified from PDF Metadata</div>
                                                            </div>
                                                        ) : result.certificate && result.certificate.issuedAt && (
                                                            <div className="text-xs">
                                                                <span className="text-slate-500">Issued At: </span>
                                                                <span className="text-slate-700">{new Date(result.certificate.issuedAt * 1000).toLocaleDateString()}</span>
                                                                <div className="text-emerald-600 mt-0.5 font-medium">Verified from Blockchain</div>
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
