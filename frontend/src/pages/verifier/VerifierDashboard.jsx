import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
                        <h2 className="text-xl font-semibold mb-4">Certificate Verification</h2>
                        <p className="text-sm text-gray-500 mb-4">
                            Upload certificate PDFs to verify their authenticity against the blockchain.
                        </p>

                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleVerify} className="space-y-4">
                            {/* Drag & Drop Upload Area */}
                            <div
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${dragActive
                                        ? 'border-blue-500 bg-blue-50'
                                        : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
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
                                <p className="text-gray-700 font-medium">
                                    {dragActive ? 'Drop PDFs here' : 'Drag & drop certificate PDFs here'}
                                </p>
                                <p className="text-sm text-gray-500 mt-1">
                                    or click to browse files
                                </p>
                            </div>

                            {/* Selected Files List */}
                            {files.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="text-sm font-medium text-gray-700 mb-2">
                                        Selected Certificates ({files.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {files.map((file, index) => (
                                            <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded border">
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-red-500">📄</span>
                                                    <span className="text-sm text-gray-700">{file.name}</span>
                                                    <span className="text-xs text-gray-400">
                                                        ({(file.size / 1024).toFixed(1)} KB)
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                                                    className="text-gray-400 hover:text-red-500 text-sm"
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
                                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
                            >
                                {loading ? 'Verifying...' : `Verify Certificate${files.length !== 1 ? 's' : ''}`}
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
                                                File
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
                                                <td className="px-6 py-4 text-sm text-gray-900">
                                                    <div className="flex items-center space-x-2">
                                                        <span>📄</span>
                                                        <span className="font-medium">{result.fileName}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <StatusBadge status={result.status} />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                    {result.valid ? (
                                                        <span className="text-green-600 text-lg">✓</span>
                                                    ) : (
                                                        <span className="text-red-600 text-lg">✗</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {result.message}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {result.certificate && (
                                                        <div>
                                                            <div className="font-medium text-gray-700">{result.certificate.recipientName}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {result.certificate.courseName}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {result.certificateData && !result.certificate && (
                                                        <div>
                                                            <div className="font-medium text-gray-700">{result.certificateData.ownerName}</div>
                                                            <div className="text-xs text-gray-400">
                                                                {result.certificateData.courseName}
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
