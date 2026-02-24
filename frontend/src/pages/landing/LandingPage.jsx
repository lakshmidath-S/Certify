import { useNavigate } from 'react-router-dom';
import { GraduationCap, ShieldCheck, Building2, SearchCheck } from 'lucide-react';

export default function LandingPage() {
    const navigate = useNavigate();

    const roles = [
        {
            name: 'Student',
            description: 'Login or register to access certificates',
            icon: <GraduationCap className="w-6 h-6 text-white stroke-[1.5]" />,
            action: () => navigate('/login?role=owner'),
        },
        {
            name: 'Admin',
            description: 'Manage institutions and wallets',
            icon: <ShieldCheck className="w-6 h-6 text-white stroke-[1.5]" />,
            action: () => navigate('/admin/login'),
        },
        {
            name: 'Issuer',
            description: 'Issue certificates (institutions only)',
            icon: <Building2 className="w-6 h-6 text-white stroke-[1.5]" />,
            action: () => navigate('/login?role=issuer'),
        },
        {
            name: 'Verifier',
            description: 'Verify educational credentials easily',
            icon: <SearchCheck className="w-6 h-6 text-white stroke-[1.5]" />,
            action: () => navigate('/verify'),
        }
    ];

    return (
        <div className="relative min-h-screen text-white font-sans overflow-hidden selection:bg-white/30">
            {/* Background Gradients & Grid are handled globally in index.css */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[60%] h-[40%] bg-white/[0.02] rounded-full blur-[120px]"></div>
            </div>

            <div className="relative z-10 mx-auto max-w-[1200px] px-4 pt-10 pb-24 flex flex-col items-center justify-start min-h-[85vh]">
                {/* Hero Section */}
                <div className="text-center md:mb-12 mb-10 mt-0 animate-fade-in-up flex flex-col items-center w-full">
                    <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-[#111111]/40 px-3 py-1.5 text-sm text-[#A1A1A1] mb-8 backdrop-blur-md shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] mt-0">
                        <span className="flex h-2 w-2 rounded-full bg-white/40 mr-2"></span>
                        Secured by blockchain technology on Base Sepolia
                    </div>
                    {/* Hero Heading: perfectly centered, tracking-tighter, forced two-line break via max-w */}
                    <h1 className="text-5xl md:text-[5rem] md:leading-[1.1] font-bold tracking-tighter mb-6 text-white max-w-[800px] mx-auto">
                        Blockchain-Powered <br className="hidden md:block" /> Certificate Platform
                    </h1>
                    <p className="mx-auto max-w-2xl text-base md:text-lg text-[#A1A1A1] font-normal leading-relaxed mt-4">
                        Issue, manage, and verify educational credentials with cryptographic certainty. The modern standard for digital academic records.
                    </p>
                </div>

                <div className="w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    {roles.map((role) => (
                        <div
                            key={role.name}
                            onClick={role.action}
                            className="group cursor-pointer relative overflow-hidden rounded-[32px] border border-white/[0.08] bg-[#111111] p-8 transition-all duration-300 hover:-translate-y-2 hover:border-white/[0.15] flex flex-col justify-start min-h-[260px] w-full"
                        >
                            <div className="mb-4 inline-flex items-center justify-center rounded-full bg-white/5 border border-white/10 p-3 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300">
                                {role.icon}
                            </div>
                            <h2 className="mb-3 text-2xl font-semibold tracking-tight text-white">{role.name}</h2>
                            <p className="text-[#A1A1A1] font-normal leading-relaxed text-sm">{role.description}</p>
                        </div>
                    ))}
                </div>
            </div>
            {/* Minimalist Footer */}
            <div className="relative z-10 py-12 text-center text-sm text-[#A1A1A1]">
                <p>© {new Date().getFullYear()} Certify. All rights reserved.</p>
            </div>
        </div>
    );
}
