import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    const roles = [
        {
            name: 'Student',
            description: 'First-time access for certificate owners',
            icon: '🎓',
            action: () => navigate('/student-onboard'),
            color: 'from-orange-500 to-red-600',
        },
        {
            name: 'Admin',
            description: 'Manage institutions and wallets',
            icon: '👑',
            action: () => navigate('/admin/login'),
            color: 'from-purple-500 to-indigo-600',
        },
        {
            name: 'Issuer',
            description: 'Issue certificates (institutions only)',
            icon: '🏛️',
            action: () => navigate('/login?role=issuer'),
            color: 'from-blue-500 to-cyan-600',
        },
        {
            name: 'Verify',
            description: 'Verify certificate authenticity',
            icon: '🔍',
            action: () => navigate('/verify'),
            color: 'from-green-500 to-emerald-600',
        },
    ];
    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center px-4">
            <div className="max-w-6xl w-full">
                <div className="text-center mb-12">
                    <h1 className="text-6xl font-bold text-white mb-4">CERTIFY</h1>
                    <p className="text-xl text-gray-300">Blockchain-Powered Certificate Platform</p>
                    <p className="text-gray-400 mt-2">Select your role to continue</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {roles.map((role) => (
                        <button
                            key={role.name}
                            onClick={role.action}
                            className={`bg-gradient-to-br ${role.color} p-8 rounded-2xl shadow-2xl hover:scale-105 transform transition-all duration-300 text-white`}
                        >
                            <div className="text-6xl mb-4">{role.icon}</div>
                            <h2 className="text-2xl font-bold mb-2">{role.name}</h2>
                            <p className="text-sm opacity-90">{role.description}</p>
                        </button>
                    ))}
                </div>

                <div className="text-center mt-12 text-gray-400 text-sm">
                    <p>Secured by blockchain technology on Base Sepolia</p>
                </div>
            </div>
        </div>
    );
}
