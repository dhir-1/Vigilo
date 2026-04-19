import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Mail, Lock, Loader2, Phone, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/context/AuthContext";
import { authAPI } from "@/lib/api";

import { useTranslation } from "@/lib/i18n";

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login } = useAuth();
  const [email, setEmail] = useState(() => {
    try {
      return localStorage.getItem("vigilo_remember_email") || "";
    } catch {
      return "";
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(() => {
    try {
      return localStorage.getItem("vigilo_remember_me") === "true";
    } catch {
      return false;
    }
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState("");
  const [recoveryPhone, setRecoveryPhone] = useState("");
  const [recoveryPassword, setRecoveryPassword] = useState("");
  const [recoveryConfirmPassword, setRecoveryConfirmPassword] = useState("");
  const [recoveryError, setRecoveryError] = useState("");
  const [recoverySuccess, setRecoverySuccess] = useState("");
  const [isRecovering, setIsRecovering] = useState(false);

  const handleRememberChange = (checked) => {
    const nextValue = Boolean(checked);
    setRemember(nextValue);

    try {
      localStorage.setItem("vigilo_remember_me", String(nextValue));
      if (nextValue) {
        localStorage.setItem("vigilo_remember_email", email);
      } else {
        localStorage.removeItem("vigilo_remember_email");
      }
    } catch {}
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError(t("Please fill in all fields"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await login(email, password);
      try {
        if (remember) {
          localStorage.setItem("vigilo_remember_me", "true");
          localStorage.setItem("vigilo_remember_email", email);
        } else {
          localStorage.removeItem("vigilo_remember_me");
          localStorage.removeItem("vigilo_remember_email");
        }
      } catch {}
      navigate("/dashboard");
    } catch (err) {
      if (err.status === 0) {
        setError(t("Cannot connect to server. Is the backend running?"));
      } else if (err.status === 401) {
        setError(t("Invalid email or password"));
      } else if (err.status === 422) {
        setError(t(err.message) || t("Please check your input"));
      } else {
        setError(t(err.message) || t("Login failed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async (e) => {
    e?.preventDefault?.();
    setRecoveryError("");
    setRecoverySuccess("");

    if (!recoveryEmail || !recoveryPhone || !recoveryPassword || !recoveryConfirmPassword) {
      setRecoveryError(t("Please fill in all recovery fields"));
      return;
    }

    if (recoveryPassword !== recoveryConfirmPassword) {
      setRecoveryError(t("New password and confirmation do not match"));
      return;
    }

    setIsRecovering(true);
    try {
      const response = await authAPI.resetPassword({
        email: recoveryEmail,
        phone: recoveryPhone,
        new_password: recoveryPassword,
      });

      setRecoverySuccess(response?.message || t("Password reset successfully"));
      setEmail(recoveryEmail);
      setRecoveryPassword("");
      setRecoveryConfirmPassword("");
      setPassword("");
    } catch (err) {
      setRecoveryError(t(err.message) || t("Password reset failed"));
    } finally {
      setIsRecovering(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 pattern-asanoha" />
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,300 Q200,200 400,300 T800,300" fill="none" stroke="hsl(42,85%,52%)" strokeWidth="1.5" opacity="0.5"/>
            <path d="M0,350 Q300,250 600,350 T800,320" fill="none" stroke="hsl(42,85%,52%)" strokeWidth="1" opacity="0.3"/>
          </svg>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative text-center space-y-6"
        >
          <div className="w-20 h-20 rounded-3xl bg-white backdrop-blur-md flex items-center justify-center mx-auto border border-white/20 shadow-xl overflow-hidden">
            <img src="/logo.png" alt="Vigilo Logo" className="w-full h-full object-contain p-2" />
          </div>
          <h1 className="text-4xl font-bold text-primary-foreground">{t("Welcome back")}</h1>
          <p className="text-primary-foreground/60 max-w-sm">
            {t("Your safety companion is waiting. Log in to access your personalized safety dashboard.")}
          </p>
        </motion.div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <img src="/logo.png" alt="Vigilo Logo" className="w-10 h-10 object-contain" />
            <span className="font-display text-xl font-bold text-foreground">Vigilo</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("Sign in")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("Enter your credentials to access your account")}</p>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 rounded-xl"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("Enter your password")}
                  className="pl-10 pr-10 rounded-xl"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={handleRememberChange}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">{t("Remember me")}</Label>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowRecovery((prev) => !prev);
                  setRecoveryError("");
                  setRecoverySuccess("");
                }}
                className="text-sm text-primary hover:underline"
              >
                {t("Forgot password?")}
              </button>
            </div>

            {showRecovery && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-4"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{t("Recover your account")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("Use your registered email and phone number to set a new password.")}
                  </p>
                </div>

                {recoveryError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
                    {recoveryError}
                  </div>
                )}

                {recoverySuccess && (
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-600 text-sm border border-green-500/20 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    {recoverySuccess}
                  </div>
                )}

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="recovery-email">{t("Registered Email")}</Label>
                    <div className="relative">
                      <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="recovery-email"
                        type="email"
                        placeholder="name@example.com"
                        className="pl-10 rounded-xl"
                        value={recoveryEmail}
                        onChange={(e) => setRecoveryEmail(e.target.value)}
                        disabled={isRecovering}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recovery-phone">{t("Registered Phone")}</Label>
                    <div className="relative">
                      <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="recovery-phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        className="pl-10 rounded-xl"
                        value={recoveryPhone}
                        onChange={(e) => setRecoveryPhone(e.target.value)}
                        disabled={isRecovering}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="recovery-password">{t("New Password")}</Label>
                      <Input
                        id="recovery-password"
                        type="password"
                        placeholder={t("Min 8 chars with a number")}
                        className="rounded-xl"
                        value={recoveryPassword}
                        onChange={(e) => setRecoveryPassword(e.target.value)}
                        disabled={isRecovering}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="recovery-confirm-password">{t("Confirm Password")}</Label>
                      <Input
                        id="recovery-confirm-password"
                        type="password"
                        placeholder={t("Repeat new password")}
                        className="rounded-xl"
                        value={recoveryConfirmPassword}
                        onChange={(e) => setRecoveryConfirmPassword(e.target.value)}
                        disabled={isRecovering}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button type="button" variant="outline" className="rounded-xl" disabled={isRecovering} onClick={handleRecovery}>
                      {isRecovering ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {t("Resetting...")}
                        </>
                      ) : (
                        t("Reset Password")
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-xl"
                      onClick={() => {
                        setShowRecovery(false);
                        setRecoveryError("");
                        setRecoverySuccess("");
                      }}
                      disabled={isRecovering}
                    >
                      {t("Close")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}

            <Button type="submit" className="w-full h-11 rounded-xl shadow-primary-glow" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t("Signing in...")}
                </>
              ) : (
                <>
                  <Shield size={18} />
                  {t("Sign In")}
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("Don't have an account?")}{" "}
            <Link to="/register" className="text-primary font-medium hover:underline">
              {t("Create one")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
