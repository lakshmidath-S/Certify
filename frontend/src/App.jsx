import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute, RoleRoute } from './components/ProtectedRoute';
import LandingPage from './pages/landing/LandingPage';
import LoginPage from './pages/login/LoginPage';
import StudentOnboardPage from './pages/student/StudentOnboardPage';
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import IssuerDashboard from './pages/issuer/IssuerDashboard';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import VerifierDashboard from './pages/verifier/VerifierDashboard';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<LandingPage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/student-onboard" element={<StudentOnboardPage />} />
                    <Route path="/admin/login" element={<AdminLoginPage />} />

                    <Route
                        path="/verify"
                        element={<VerifierDashboard />}
                    />

                    <Route
                        path="/admin/dashboard"
                        element={
                            <ProtectedRoute>
                                <RoleRoute allowedRoles={['ADMIN']}>
                                    <AdminDashboard />
                                </RoleRoute>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/issuer/dashboard"
                        element={
                            <ProtectedRoute>
                                <RoleRoute allowedRoles={['ISSUER']}>
                                    <IssuerDashboard />
                                </RoleRoute>
                            </ProtectedRoute>
                        }
                    />

                    <Route
                        path="/owner/dashboard"
                        element={
                            <ProtectedRoute>
                                <RoleRoute allowedRoles={['OWNER']}>
                                    <OwnerDashboard />
                                </RoleRoute>
                            </ProtectedRoute>
                        }
                    />

                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
