import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { MapPin, Route, Shield, Brain, Phone, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Footer } from "@/components/common/Footer";
import { useTranslation } from "@/lib/i18n";
import { publicAPI } from "@/lib/api";
import { Vigilo3DMap } from "@/components/common/Vigilo3DMap";
import { useAuth } from "@/context/AuthContext";

function useCountUp(end, duration = 1800, startOnView = false, inView = true) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let start = 0;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setValue(end);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);

    return () => clearInterval(timer);
  }, [end, duration, inView]);

  return value;
}

function StatCard({ value, suffix = "", label }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const count = useCountUp(value, 1800, true, inView);

  const display = value >= 1000 ? `${(count / 1000).toFixed(1)}K` : `${count}`;

  return (
    <div ref={ref} className="text-center p-4 rounded-2xl bg-card shadow-soft border-ceramic">
      <p className="text-2xl font-bold text-primary tabular-nums">
        {display}{suffix}
      </p>
      <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1 tracking-widest">{label}</p>
    </div>
  );
}

export default function Landing() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const [stats, setStats] = useState(null);

  const navigateToFeature = (path) => {
    navigate(isAuthenticated ? path : "/login");
  };

  useEffect(() => {
    publicAPI.stats()
      .then(setStats)
      .catch(() => setStats(null));
  }, []);

  useEffect(() => {
    if (!location.hash) return;

    const id = location.hash.replace("#", "");
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    }, 50);

    return () => window.clearTimeout(timer);
  }, [location.hash]);

  const features = [
    {
      icon: MapPin,
      title: t("Live Crime Map"),
      description: t("AI-powered interactive map with real-time crime data, heatmaps, and safety scores for every neighborhood."),
      color: "bg-primary/10 text-primary",
      gradient: "bg-safe-gradient",
      path: "/dashboard",
    },
    {
      icon: Route,
      title: t("Safe Route Planning"),
      description: t("Navigate confidently with safety-optimized routes. Compare safest, fastest, and balanced options."),
      color: "bg-secondary/10 text-secondary",
      gradient: "bg-feature-gradient",
      path: "/route-planner",
    },
    {
      icon: Phone,
      title: t("SOS Emergency Alerts"),
      description: t("One-tap emergency alerts that notify your contacts and nearby authorities with your live location."),
      color: "bg-destructive/10 text-destructive",
      gradient: "bg-danger-gradient",
      path: "/dashboard",
    },
    {
      icon: Brain,
      title: t("AI Verification"),
      description: t("Advanced AI analyzes every report for authenticity - EXIF data, image quality, and consistency checks."),
      color: "bg-warning/10 text-warning",
      gradient: "bg-warning-gradient",
      path: "/report",
    },
  ];

  const steps = [
    { number: "01", title: t("Report an Incident"), description: t("Submit crime reports with photos, video, and precise location data.") },
    { number: "02", title: t("AI Analyzes & Verifies"), description: t("Our AI checks every report for authenticity and assigns a trust score.") },
    { number: "03", title: t("Community Gets Safer"), description: t("Verified data appears on the live map, helping everyone stay informed.") },
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
            <img src="/logo.png" alt="Vigilo Logo" className="w-10 h-10 object-contain" />
            <span className="font-display text-xl font-bold text-foreground tracking-tight">Vigilo</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" className="px-3 sm:px-4" onClick={() => navigate("/login")}>{t("Login")}</Button>
            <Button onClick={() => navigate("/register")} className="shadow-primary-glow px-3 sm:px-4">{t("Get Started")}</Button>
          </div>
        </div>
      </nav>

      <section className="relative px-4 sm:px-6 py-16 sm:py-20 lg:py-32 max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-10 lg:gap-12">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 space-y-6"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Shield size={14} />
              <span>{t("AI-Powered Safety Platform")}</span>
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold tracking-[-0.04em] leading-[1.05] text-foreground">
              {t("Your city, safer with Vigilo")}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
              {t("AI-powered crime mapping, safe route planning, and real-time community alerts. Navigate your world with confidence.")}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button size="lg" onClick={() => navigate("/register")} className="h-12 w-full sm:w-auto px-8 rounded-xl shadow-primary-glow">
                <Shield size={18} />
                {t("Start for Free")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}
                className="h-12 w-full sm:w-auto px-8 rounded-xl"
              >
                <Eye size={18} />
                {t("View Demo")}
              </Button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-1 max-w-lg w-full relative z-10"
          >
            <Vigilo3DMap activeZones={stats ? stats.active_zones : 21} />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-14 sm:mt-16"
        >
          <StatCard value={stats ? stats.active_users : 0} suffix="+" label={t("Active Users")} />
          <StatCard value={stats ? stats.reports_verified : 0} label={t("Reports Verified")} />
          <StatCard value={stats ? stats.accuracy_rate : 0} suffix="%" label={t("Accuracy Rate")} />
          <StatCard value={stats ? stats.active_zones : 0} suffix="+" label={t("Zones Monitored")} />
        </motion.div>
      </section>

      <section id="features-section" className="px-4 sm:px-6 py-20 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              {t("Everything you need to stay safe")}
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              {t("Vigilo combines cutting-edge AI with community intelligence to create the most comprehensive safety platform.")}
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {features.map((f, i) => (
              <motion.button
                key={f.title}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i }}
                whileHover={{ y: -6 }}
                onClick={() => navigateToFeature(f.path)}
                className={`${f.gradient} p-8 rounded-[24px] shadow-soft border-ceramic cursor-pointer transition-shadow hover:shadow-hover group w-full text-left appearance-none`}
              >
                <div className={`w-12 h-12 rounded-2xl ${f.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-soft`}>
                  <f.icon size={24} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.description}</p>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      <section id="how-it-works" className="px-4 sm:px-6 py-20 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            {t("How Vigilo works")}
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            {t("Three simple steps to make your community safer.")}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 * i }}
              className="text-center group"
            >
              <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 text-2xl font-display font-bold group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-soft group-hover:shadow-primary/30 group-hover:-translate-y-1">
                {step.number}
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="px-4 sm:px-6 py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="max-w-4xl mx-auto text-center bg-primary rounded-[32px] sm:rounded-[40px] p-8 sm:p-12 lg:p-20 shadow-primary-glow relative overflow-hidden"
        >
          <div className="absolute inset-0 opacity-10 pattern-asanoha" />
          <div className="relative z-10">
            <h2 className="text-3xl lg:text-5xl font-bold text-primary-foreground mb-6 leading-tight">
              {t("Ready to make your city safer?")}
            </h2>
            <p className="text-primary-foreground/70 mb-10 text-lg max-w-md mx-auto">
              {t("Join thousands of citizens using Vigilo to stay informed and protect their communities.")}
            </p>
            <div className="flex flex-wrap gap-3 justify-center">
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate("/register")}
                className="h-14 w-full sm:w-auto px-10 rounded-2xl text-lg font-bold shadow-xl hover:scale-105 active:scale-95 transition-all"
              >
                {t("Create Free Account")}
                <ChevronRight size={20} className="ml-1" />
              </Button>
            </div>
          </div>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
