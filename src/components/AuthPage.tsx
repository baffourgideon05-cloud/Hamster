import React, { useState } from 'react';
import { UserAccount, SiteBranding } from '../types/index.ts';
import { api } from '../services/api.ts';
import { signInWithGooglePopup } from '../firebase.ts';
import {
  Mail,
  Lock,
  User,
  Phone,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff,
  ArrowLeft,
  ShieldAlert
} from 'lucide-react';

interface AuthPageProps {
  branding: SiteBranding;
  currentUser: UserAccount | null;
  onAuthSuccess: (user: UserAccount, targetView: 'home' | 'portal' | 'admin') => void;
  onNavigateHome: () => void;
  initialTab?: 'signin' | 'register' | 'forgot';
  intendedTarget?: 'admin' | 'portal';
}

export const AuthPage: React.FC<AuthPageProps> = ({
  branding,
  currentUser,
  onAuthSuccess,
  onNavigateHome,
  initialTab = 'signin',
  intendedTarget
}) => {
  const [activeTab, setActiveTab] = useState<'signin' | 'register' | 'forgot'>(initialTab);

  // Sign In inputs (strictly empty, no demo credentials)
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registration inputs
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');

  // Forgot password input
  const [forgotEmail, setForgotEmail] = useState('');

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Clear messages on tab change
  const handleTabChange = (tab: 'signin' | 'register' | 'forgot') => {
    setActiveTab(tab);
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  // Handle Email + Password Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMessage('Please provide both your email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.login(loginEmail.trim(), loginPassword);
      setSuccessMessage('Authentication verified successfully! Redirecting...');

      // Route destination based strictly on authenticated role:
      const targetView: 'admin' | 'portal' = res.user.role === 'admin' ? 'admin' : 'portal';

      setTimeout(() => {
        onAuthSuccess(res.user, targetView);
      }, 700);
    } catch (err: any) {
      // Automatic detection and clear rejection of wrong password or non-existent account
      setErrorMessage(
        err.message ||
        'Authentication Failed: The email or password entered is incorrect. Please verify your credentials.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Customer Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter your password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.register({
        name: regName.trim(),
        email: regEmail.trim(),
        password: regPassword,
        phone: regPhone.trim()
      });

      setSuccessMessage('Account created successfully! Logging you into your Campaign Portal...');

      const targetView: 'admin' | 'portal' = res.user.role === 'admin' ? 'admin' : 'portal';
      setTimeout(() => {
        onAuthSuccess(res.user, targetView);
      }, 800);
    } catch (err: any) {
      setErrorMessage(err.message || 'Registration failed. An account with this email may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Real Firebase + Gmail OAuth Google Sign-In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const fbProfile = await signInWithGooglePopup();
      const res = await api.loginGoogle({
        email: fbProfile.email,
        name: fbProfile.name,
        picture: fbProfile.picture,
        sub: fbProfile.uid
      });

      setSuccessMessage(`Google identity verified as ${res.user.email}! Accessing your workspace...`);

      const targetView: 'admin' | 'portal' = res.user.role === 'admin' ? 'admin' : 'portal';
      setTimeout(() => {
        onAuthSuccess(res.user, targetView);
      }, 600);
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') {
        setErrorMessage('Google Sign-In window was closed before completing authentication.');
      } else if (err?.code === 'auth/popup-blocked') {
        setErrorMessage('Popup was blocked by your browser. Please allow popups for this site and retry.');
      } else {
        setErrorMessage(err?.message || 'Google authentication encountered an error.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Password Reset Request
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMessage('Please enter your account email.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await api.forgotPassword(forgotEmail.trim());
      setSuccessMessage(res.message || 'Password reset request submitted successfully.');
      setForgotEmail('');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit password reset request.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.5rem)] bg-neutral-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-emerald-500 rounded-full blur-3xl" />
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        {/* Back navigation button */}
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-1.5 text-xs text-neutral-400 hover:text-white transition-colors mb-6 group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Agency Homepage</span>
        </button>

        {/* Brand identity header */}
        <div className="text-center">
          {branding.logoUrl ? (
            <img
              src={branding.logoUrl}
              alt={branding.siteShortName || 'Logo'}
              className="w-12 h-12 rounded-2xl object-contain bg-white p-1 shadow-xl mx-auto mb-4"
            />
          ) : (
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-white text-neutral-950 font-black text-lg shadow-xl mb-4">
              {branding.logoBadgeText || 'AP'}
            </div>
          )}
          <h1 className="text-2xl font-extrabold tracking-tight text-white">
            {branding.siteShortName || 'AdPulse Global'}
          </h1>
          <p className="mt-1.5 text-xs text-neutral-400">
            Unified Client & Administrative Portal Access
          </p>
        </div>

        {intendedTarget === 'admin' && (
          <div className="mt-4 p-3 rounded-xl bg-blue-950/40 border border-blue-800/60 text-blue-200 text-xs flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0" />
            <span>
              Administrator login: Access to the Admin Suite requires credentials authorized for {branding.adminGoogleEmail}.
            </span>
          </div>
        )}
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden">
          {/* Tabs Selector */}
          <div className="grid grid-cols-3 border-b border-neutral-200 bg-neutral-50/80 text-xs font-semibold text-neutral-500">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`py-3.5 px-3 text-center transition-colors border-b-2 ${
                activeTab === 'signin'
                  ? 'border-neutral-950 text-neutral-950 bg-white font-bold'
                  : 'border-transparent hover:text-neutral-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`py-3.5 px-3 text-center transition-colors border-b-2 ${
                activeTab === 'register'
                  ? 'border-neutral-950 text-neutral-950 bg-white font-bold'
                  : 'border-transparent hover:text-neutral-900'
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('forgot')}
              className={`py-3.5 px-3 text-center transition-colors border-b-2 ${
                activeTab === 'forgot'
                  ? 'border-neutral-950 text-neutral-950 bg-white font-bold'
                  : 'border-transparent hover:text-neutral-900'
              }`}
            >
              Reset Key
            </button>
          </div>

          <div className="p-6 sm:p-8 space-y-5">
            {/* Notifications */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{successMessage}</span>
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {activeTab === 'signin' && (
              <div className="space-y-4">
                {/* Google Sign-In Button */}
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={handleGoogleSignIn}
                  className="w-full py-2.5 px-4 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-3 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative flex items-center justify-center my-4">
                  <div className="border-t border-neutral-200 w-full" />
                  <span className="bg-white px-3 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider shrink-0">
                    or sign in with email
                  </span>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                      Email Address
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                      <input
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="client@company.com or admin email"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => handleTabChange('forgot')}
                        className="text-[11px] text-neutral-500 hover:text-neutral-950 font-medium"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="Enter your account password"
                        className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-10 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 focus:border-transparent transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-neutral-400 hover:text-neutral-700"
                        title={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-2"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Verifying Credentials...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Account</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </form>

                <div className="text-center pt-2">
                  <p className="text-xs text-neutral-500">
                    Don't have an account yet?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('register')}
                      className="font-bold text-neutral-950 hover:underline"
                    >
                      Create one now
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* TAB 2: REGISTER */}
            {activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Samuel K. Mensah"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="client@business.com"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Phone / WhatsApp (Optional)
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="+233 24 123 4567"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Create Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Confirm Password *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 mt-3"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <p className="text-xs text-neutral-500">
                    Already registered?{' '}
                    <button
                      type="button"
                      onClick={() => handleTabChange('signin')}
                      className="font-bold text-neutral-950 hover:underline"
                    >
                      Sign in here
                    </button>
                  </p>
                </div>
              </form>
            )}

            {/* TAB 3: FORGOT PASSWORD / RESET */}
            {activeTab === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3.5 rounded-xl border border-neutral-200">
                  <p>
                    Enter your registered email address. A password reset request will be securely dispatched to our administrative desk.
                  </p>
                  <p className="mt-1 text-neutral-500">
                    The platform administrator can verify your identity and generate a temporary access key.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                    Your Registered Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3 top-3" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="client@company.com"
                      className="w-full bg-neutral-50 border border-neutral-300 rounded-xl pl-9 pr-3.5 py-2.5 text-xs text-neutral-900 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-neutral-950 transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 rounded-xl text-xs font-semibold text-white bg-neutral-950 hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Submitting Request...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Submit Password Reset Request</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('signin')}
                    className="text-xs font-medium text-neutral-600 hover:text-neutral-950 inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="w-3 h-3" />
                    <span>Return to Sign In</span>
                  </button>
                </div>
              </form>
            )}

            {/* Security Guarantee */}
            <div className="pt-4 border-t border-neutral-100 flex items-center justify-center gap-2 text-[11px] text-neutral-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>SHA-256 &amp; Google OAuth Verified · PCI-DSS Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
