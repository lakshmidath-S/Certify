import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Building2, SearchCheck } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    const roles = [
        {
            name: 'Student',
            description: 'Login or register to access certificates',
            icon: <GraduationCap className="w-6 h-6 text-blue-600 stroke-[1.5] group-hover:text-white transition-colors duration-300" />,
            action: () => navigate('/login?role=owner'),
        },
        {
            name: 'Admin',
            description: 'Manage institutions and wallets',
            icon: <ShieldCheck className="w-6 h-6 text-blue-600 stroke-[1.5] group-hover:text-white transition-colors duration-300" />,
            action: () => navigate('/admin/login'),
        },
        {
            name: 'Issuer',
            description: 'Issue certificates (institutions only)',
            icon: <Building2 className="w-6 h-6 text-blue-600 stroke-[1.5] group-hover:text-white transition-colors duration-300" />,
            action: () => navigate('/login?role=issuer'),
        },
        {
            name: 'Verifier',
            description: 'Verify educational credentials easily',
            icon: <SearchCheck className="w-6 h-6 text-blue-600 stroke-[1.5] group-hover:text-white transition-colors duration-300" />,
            action: () => navigate('/verify'),
        }
    ];

    return (
        <div className="relative min-h-screen text-slate-800 font-sans overflow-hidden selection:bg-blue-600/30">
            {/* Background Gradients & Grid are handled globally in index.css */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[80%] h-[60%] bg-blue-600/10 rounded-full blur-[140px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-white rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 mx-auto max-w-[1200px] px-4 pt-10 pb-24 flex flex-col items-center justify-start min-h-[85vh]">
                {/* Hero Section */}
                <div className="text-center md:mb-12 mb-10 mt-0 animate-fade-in-up flex flex-col items-center w-full">
                    <div className="inline-flex items-center rounded-full border border-blue-200 bg-white/90 px-4 py-2 text-sm text-blue-700 mb-8 backdrop-blur-md shadow-sm mt-0 font-medium">
                        <span className="flex h-2 w-2 rounded-full bg-blue-600 mr-2"></span>
                        Secured by blockchain technology on Base Sepolia
                    </div>
                    {/* Hero Heading: perfectly centered, tracking-tighter, forced two-line break via max-w */}
                    <h1 className="text-5xl md:text-[5rem] md:leading-[1.1] font-bold tracking-tighter mb-6 text-slate-900 max-w-[800px] mx-auto">
                        Blockchain-Powered <br className="hidden md:block" /> Certificate Platform
                    </h1>
                    <p className="mx-auto max-w-2xl text-base md:text-lg text-slate-600 font-normal leading-relaxed mt-4">
                        Issue, manage, and verify educational credentials with cryptographic certainty. The modern standard for digital academic records.
                    </p>
                </div>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    {/* Student – Blue */}
                    <div
                        onClick={() => navigate('/login?role=owner')}
                        className="group cursor-pointer relative rounded-[28px] bg-white shadow-[0_4px_20px_rgb(37,99,235,0.12)] border-2 border-blue-400 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgb(37,99,235,0.22)] flex flex-col justify-start min-h-[260px] w-full"
                    >
                        <div className="mb-5 inline-flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 p-4 group-hover:scale-110 group-hover:bg-blue-600 transition-all duration-300 w-fit">
                            <GraduationCap className="w-6 h-6 text-blue-600 group-hover:text-white stroke-[1.5] transition-colors duration-300" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors duration-300">Student</h2>
                        <p className="text-slate-500 font-normal leading-relaxed text-sm">Login or register to access certificates</p>
                        <div className="mt-auto pt-5">
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full">Certificate Owner →</span>
                        </div>
                    </div>

                    {/* Admin – Violet */}
                    <div
                        onClick={() => navigate('/admin/login')}
                        className="group cursor-pointer relative rounded-[28px] bg-white shadow-[0_4px_20px_rgb(124,58,237,0.12)] border-2 border-violet-400 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgb(124,58,237,0.22)] flex flex-col justify-start min-h-[260px] w-full"
                    >
                        <div className="mb-5 inline-flex items-center justify-center rounded-2xl bg-violet-50 border border-violet-200 p-4 group-hover:scale-110 group-hover:bg-violet-600 transition-all duration-300 w-fit">
                            <ShieldCheck className="w-6 h-6 text-violet-600 group-hover:text-white stroke-[1.5] transition-colors duration-300" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900 group-hover:text-violet-600 transition-colors duration-300">Admin</h2>
                        <p className="text-slate-500 font-normal leading-relaxed text-sm">Manage institutions and wallets</p>
                        <div className="mt-auto pt-5">
                            <span className="text-xs font-semibold text-violet-600 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">Platform Control →</span>
                        </div>
                    </div>

                    {/* Issuer – Emerald */}
                    <div
                        onClick={() => navigate('/login?role=issuer')}
                        className="group cursor-pointer relative rounded-[28px] bg-white shadow-[0_4px_20px_rgb(16,185,129,0.12)] border-2 border-emerald-400 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgb(16,185,129,0.22)] flex flex-col justify-start min-h-[260px] w-full"
                    >
                        <div className="mb-5 inline-flex items-center justify-center rounded-2xl bg-emerald-50 border border-emerald-200 p-4 group-hover:scale-110 group-hover:bg-emerald-600 transition-all duration-300 w-fit">
                            <Building2 className="w-6 h-6 text-emerald-600 group-hover:text-white stroke-[1.5] transition-colors duration-300" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900 group-hover:text-emerald-600 transition-colors duration-300">Issuer</h2>
                        <p className="text-slate-500 font-normal leading-relaxed text-sm">Issue certificates (institutions only)</p>
                        <div className="mt-auto pt-5">
                            <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full">Mint Credentials →</span>
                        </div>
                    </div>

                    {/* Verifier – Amber */}
                    <div
                        onClick={() => navigate('/verify')}
                        className="group cursor-pointer relative rounded-[28px] bg-white shadow-[0_4px_20px_rgb(245,158,11,0.12)] border-2 border-amber-400 p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_12px_40px_rgb(245,158,11,0.22)] flex flex-col justify-start min-h-[260px] w-full"
                    >
                        <div className="mb-5 inline-flex items-center justify-center rounded-2xl bg-amber-50 border border-amber-200 p-4 group-hover:scale-110 group-hover:bg-amber-500 transition-all duration-300 w-fit">
                            <SearchCheck className="w-6 h-6 text-amber-600 group-hover:text-white stroke-[1.5] transition-colors duration-300" />
                        </div>
                        <h2 className="mb-2 text-xl font-semibold tracking-tight text-slate-900 group-hover:text-amber-600 transition-colors duration-300">Verifier</h2>
                        <p className="text-slate-500 font-normal leading-relaxed text-sm">Verify educational credentials easily</p>
                        <div className="mt-auto pt-5">
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full">Check Authenticity →</span>
                        </div>
                    </div>
                </div>
            </div>
            {/* Minimalist Footer */}
            <div className="relative z-10 py-12 text-center text-sm text-slate-500">
                <p>© {new Date().getFullYear()} Certify. All rights reserved.</p>
            </div>
        </div>
    );
}
