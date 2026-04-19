import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield, Eye, EyeOff, Mail, Lock, User, Phone, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", phone: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const errs = {};
    if (!form.full_name.trim()) errs.full_name = t("Full name is required");
    if (!form.email.trim()) errs.email = t("Email is required");
    if (!form.password || form.password.length < 8) errs.password = t("Password must be at least 8 characters");
    else if (!/\d/.test(form.password)) errs.password = t("Password must contain at least one number");
    if (!form.phone.trim()) errs.phone = t("Phone number is required");
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setIsLoading(true);
    setApiError("");

    try {
      await register(form);
      navigate("/login");
    } catch (err) {
      if (err.status === 0) {
        setApiError(t("Cannot connect to server. Is the backend running?"));
      } else if (err.status === 422) {
        setApiError(t(err.message) || t("Please check your input"));
      } else if (err.status === 409 || (err.message && err.message.toLowerCase().includes("already"))) {
        setApiError(t("An account with this email already exists"));
      } else {
        setApiError(t(err.message) || t("Registration failed"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const update = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Panel */}
      <div className="hidden lg:flex flex-1 bg-primary relative overflow-hidden items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 pattern-asanoha" />
        <div className="absolute inset-0 opacity-20">
          <svg viewBox="0 0 800 600" className="w-full h-full" preserveAspectRatio="none">
            <path d="M0,300 Q200,200 400,300 T800,300" fill="none" stroke="hsl(42,85%,52%)" strokeWidth="1.5" opacity="0.5"/>
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
          <h1 className="text-4xl font-bold text-primary-foreground">{t("Join Vigilo")}</h1>
          <p className="text-primary-foreground/60 max-w-sm">
            {t("Be part of a community making cities safer. Create your account and start contributing today.")}
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
          <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
            <img src="/logo.png" alt="Vigilo Logo" className="w-10 h-10 object-contain" />
            <span className="font-display text-xl font-bold text-foreground">Vigilo</span>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-foreground">{t("Create account")}</h2>
            <p className="text-sm text-muted-foreground mt-1">{t("Fill in your details to get started")}</p>
          </div>

          {apiError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {apiError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name">{t("Full Name")}</Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="pl-10 rounded-xl"
                  value={form.full_name}
                  onChange={(e) => update("full_name", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.full_name && <p className="text-xs text-destructive">{errors.full_name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t("Email")}</Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-10 rounded-xl"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("Password")}</Label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder={t("Min 8 chars with a number")}
                  className="pl-10 pr-10 rounded-xl"
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
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
              {errors.password && <p className="text-xs text-destructive">{errors.password}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">{t("Phone Number")}</Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210"
                  className="pl-10 rounded-xl"
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                  disabled={isLoading}
                />
              </div>
              {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
            </div>

            <Button type="submit" className="w-full h-11 rounded-xl shadow-primary-glow" size="lg" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t("Creating account...")}
                </>
              ) : (
                <>
                  <Shield size={18} />
                  {t("Create Account")}
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {t("Already have an account?")}{" "}
            <Link to="/login" className="text-primary font-medium hover:underline">
              {t("Sign in")}
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
