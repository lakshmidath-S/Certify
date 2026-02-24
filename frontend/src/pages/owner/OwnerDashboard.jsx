import { useState, useEffect } from 'react';
import { DashboardLayout } from '../../components/DashboardLayout';
import { GraduationCap } from 'lucide-react';
import { certificateAPI } from '../../api';
import { StatusBadge } from '../../components/StatusBadge';

export default function OwnerDashboard() {
    const [certificates, setCertificates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        fetchCertificates();
    }, []);

    const fetchCertificates = async () => {
        try {
            const result = await certificateAPI.getMyCertificates();
            setCertificates(result.certificates);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load certificates');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (certificateId, certificateNumber) => {
        try {
            const blob = await certificateAPI.downloadCertificate(certificateId);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `certificate-${certificateNumber}.pdf`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (err) {
            setError('Failed to download certificate');
        }
    };

    return (
        <DashboardLayout title="Owner Dashboard">
            <div className="space-y-6 animate-fade-in-up">

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-3xl font-semibold tracking-tight text-white mb-2">My Certificates</h1>
                        <p className="text-[#A1A1A1] text-sm">View and download your blockchain-verified credentials.</p>
                    </div>
                </div>

                <div className="bg-gradient-to-b from-card-top to-card-bottom rounded-[32px] border border-white/[0.08] p-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] relative overflow-hidden">

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm mb-6">
                            {error}
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-[#A1A1A1]">
                            <div className="animate-pulse flex flex-col items-center">
                                <div className="h-8 w-8 rounded-full border-2 border-white/20 border-t-white animate-spin mb-4"></div>
                                <p>Loading certificates...</p>
                            </div>
                        </div>
                    ) : certificates.length === 0 ? (
                        <div className="text-center py-16 text-[#A1A1A1]">
                            <div className="mx-auto mb-4 w-12 h-12 flex items-center justify-center rounded-full bg-white/[0.05] border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                <GraduationCap className="w-6 h-6 text-white stroke-[1.5]" />
                            </div>
                            <p className="text-white font-medium mb-1">No certificates found</p>
                            <p className="text-sm">You haven't received any verified credentials yet.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead>
                                    <tr className="border-b border-white/[0.08]">
                                        <th className="px-4 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Certificate #</th>
                                        <th className="px-4 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Course</th>
                                        <th className="px-4 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Issuer</th>
                                        <th className="px-4 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Issue Date</th>
                                        <th className="px-4 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider">Status</th>
                                        <th className="px-4 py-4 text-xs font-medium text-[#A1A1A1] uppercase tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.04]">
                                    {certificates.map((cert) => (
                                        <tr key={cert.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-4 py-5 whitespace-nowrap text-sm font-mono text-[#A1A1A1]">
                                                {cert.certificateNumber}
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap">
                                                <div className="text-sm font-medium text-white">{cert.courseName}</div>
                                                <div className="text-xs text-[#A1A1A1] mt-1">{cert.recipientName}</div>
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-sm text-[#A1A1A1]">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-[#1A1A1A] border border-white/[0.08] flex items-center justify-center text-[10px] text-white">
                                                        {cert.issuer.name.charAt(0)}
                                                    </div>
                                                    {cert.issuer.name}
                                                </div>
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-sm text-[#A1A1A1]">
                                                {new Date(cert.issueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap">
                                                <StatusBadge status={cert.isRevoked ? 'REVOKED' : 'VALID'} />
                                            </td>
                                            <td className="px-4 py-5 whitespace-nowrap text-sm text-right">
                                                <button
                                                    onClick={() => handleDownload(cert.id, cert.certificateNumber)}
                                                    className="inline-flex items-center justify-center rounded-full bg-white text-black px-4 py-1.5 text-xs font-semibold transition-transform hover:scale-105 active:scale-95 shadow-[0_0_10px_rgba(255,255,255,0.1)] opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                >
                                                    Download PDF
                                                </button>
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
