import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, ChevronLeft } from 'lucide-react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : 'http://localhost:3000/api';

export default function StudentOnboardPage() {
    const [step, setStep] = useState(1);
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState('');

    const navigate = useNavigate();

    const handleRequestOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            const response = await axios.post(`${API_BASE}/student-auth/request-otp`, { email });
            setMessage(response.data.message);

            // DEV ONLY - show OTP
            if (response.data.otp) {
                setMessage(`OTP sent! (DEV: ${response.data.otp})`);
            }

            setStep(2);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to send OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);

        try {
            await axios.post(`${API_BASE}/student-auth/verify-otp`, { email, otp });
            setMessage('Email verified! Please set your password.');
            setStep(3);
        } catch (err) {
            setError(err.response?.data?.error || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    const handleCompleteRegistration = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const response = await axios.post(`${API_BASE}/student-auth/complete-registration`, {
                email,
                password,
                firstName,
                lastName
            });

            // Store token and user data
            localStorage.setItem('token', response.data.accessToken);
            localStorage.setItem('user', JSON.stringify(response.data.user));

            // Redirect to owner dashboard
            navigate('/owner/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen text-gray-900 font-sans flex items-center justify-center px-4 overflow-hidden selection:bg-blue-500/30">
            {/* Background elements handled via index.css globally */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[40%] h-[40%] bg-blue-500/5 rounded-full blur-[100px]"></div>
            </div>

            <div className="relative z-10 max-w-md w-full bg-white rounded-[28px] border-2 border-blue-400 shadow-[0_8px_32px_rgb(37,99,235,0.18)] backdrop-blur-md p-10 animate-fade-in-up">
                <div className="text-center mb-8 flex flex-col items-center mt-2">
                    <div className="mb-6 w-12 h-12 flex items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 shadow-sm">
                        <GraduationCap className="w-6 h-6 text-blue-600 stroke-[1.5]" />
                    </div>
                    <h1 className="text-3xl font-semibold tracking-tight text-gray-900">Student Onboarding</h1>
                    <p className="text-gray-600 mt-3 font-normal">First-time access for certificate owners</p>
                </div>

                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div className={`flex items-center ${step >= 1 ? 'text-gray-900' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-medium text-sm transition-colors ${step >= 1 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200'}`}>
                                1
                            </div>
                            <span className="ml-3 text-sm font-medium">Email</span>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
                        <div className={`flex items-center ${step >= 2 ? 'text-gray-900' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-medium text-sm transition-colors ${step >= 2 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200'}`}>
                                2
                            </div>
                            <span className="ml-3 text-sm font-medium">Verify</span>
                        </div>
                        <div className="flex-1 h-px bg-gray-200 mx-4"></div>
                        <div className={`flex items-center ${step >= 3 ? 'text-gray-900' : 'text-gray-400'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border font-medium text-sm transition-colors ${step >= 3 ? 'bg-blue-600 text-white border-blue-600' : 'bg-gray-50 border-gray-200'}`}>
                                3
                            </div>
                            <span className="ml-3 text-sm font-medium">Complete</span>
                        </div>
                    </div>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-2xl text-sm mb-6">
                        {error}
                    </div>
                )}

                {message && (
                    <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-4 py-3 rounded-2xl text-sm mb-6">
                        {message}
                    </div>
                )}

                {step === 1 && (
                    <form onSubmit={handleRequestOTP} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                University Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-gray-400"
                                placeholder="student@university.edu"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                        >
                            {loading ? 'Sending OTP...' : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {step === 2 && (
                    <form onSubmit={handleVerifyOTP} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2 text-center w-full">
                                Enter 6-digit OTP
                            </label>
                            <input
                                type="text"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:bg-white transition-all text-center text-3xl tracking-[0.5em] font-light"
                                placeholder="000000"
                                maxLength="6"
                                required
                            />
                            <p className="text-xs text-gray-500 mt-3 text-center">Check your email: <span className="text-gray-900">{email}</span></p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-blue-600 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 hover:bg-blue-700 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-[0_4px_14px_0_rgb(13,110,253,0.39)]"
                        >
                            {loading ? 'Verifying...' : 'Verify OTP'}
                        </button>

                        <button
                            type="button"
                            onClick={() => setStep(1)}
                            className="w-full text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center"
                        >
                            <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Change email
                        </button>
                    </form>
                )}

                {step === 3 && (
                    <form onSubmit={handleCompleteRegistration} className="space-y-5">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    First Name
                                </label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Last Name
                                </label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all placeholder:text-gray-400"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-full bg-gray-900 px-6 py-3.5 text-white font-semibold transition-transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100 shadow-md mt-2"
                        >
                            {loading ? 'Creating account...' : 'Complete Registration'}
                        </button>
                    </form>
                )}

                <div className="mt-8 text-center space-y-4 pt-6 border-t border-gray-100">
                    <div>
                        <span className="text-sm text-gray-500">Already registered? </span>
                        <button
                            type="button"
                            onClick={() => navigate('/login?role=owner')}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Login here
                        </button>
                    </div>
                    <div>
                        <button
                            onClick={() => navigate('/')}
                            className="text-sm text-gray-500 hover:text-gray-900 transition-colors flex items-center justify-center w-full"
                        >
                            <ChevronLeft className="mr-1 w-4 h-4 stroke-[2]" /> Back to home
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 pt-2">
                        Institutions: Contact admin for onboarding
                    </p>
                </div>
            </div>
        </div>
    );
}
