import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Shield, Eye, Star, Award, Bell, TrendingUp,
  MapPin, Clock, CheckCircle2, Lock, Loader2, AlertCircle,
  FileText, Calendar, Hash, ExternalLink, User
} from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { Button } from "@/components/ui/button";
import { publicAPI } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

/* ── Badge config ── */
const BADGE_META = {
  "Safety Pioneer":   { icon: Shield,      color: "bg-primary/10 text-primary border-primary/20" },
  "Watchful Neighbor":{ icon: Eye,         color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  "Top Reporter":     { icon: Star,        color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
  "Community Hero":   { icon: Award,       color: "bg-purple-500/10 text-purple-500 border-purple-500/20" },
  "Survivor":         { icon: Bell,        color: "bg-red-500/10 text-red-500 border-red-500/20" },
  "City Guardian":    { icon: TrendingUp,  color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
};

const SEVERITY_COLORS = {
  high:   "bg-red-500/15 text-red-500 border-red-500/20",
  medium: "bg-yellow-500/15 text-yellow-500 border-yellow-500/20",
  low:    "bg-green-500/15 text-green-500 border-green-500/20",
};

function StatCard({ label, value, icon: Icon, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="bg-card border border-border/50 rounded-2xl p-5 flex flex-col items-center justify-center text-center gap-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
        <Icon size={18} />
      </div>
      <span className="text-2xl font-display font-bold text-foreground">{value ?? "—"}</span>
      <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">{label}</span>
    </motion.div>
  );
}

export default function PublicProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!userId) { setError("No user ID provided"); setIsLoading(false); return; }
    setIsLoading(true);
    publicAPI.userProfile(userId)
      .then(setProfile)
      .catch((err) => setError(err.message || "User not found"))
      .finally(() => setIsLoading(false));
  }, [userId]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 size={36} className="animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Loading profile…</p>
          </div>
        </main>
      </div>
    );
  }

  /* ── Error / Not Found ── */
  if (error || !profile) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm space-y-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
              <AlertCircle size={30} />
            </div>
            <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
            <p className="text-sm text-muted-foreground">{error || "This profile does not exist or has been removed."}</p>
            <Button variant="outline" onClick={() => navigate(-1)} className="gap-2 rounded-xl">
              <ArrowLeft size={14} /> Go back
            </Button>
          </motion.div>
        </main>
      </div>
    );
  }

  const joinYear = profile.joined
    ? new Date(profile.joined).getFullYear()
    : null;

  const visibleReports = showAll
    ? profile.recent_reports
    : (profile.recent_reports || []).slice(0, 6);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar
          title={profile.full_name || "Community Member"}
          subtitle={profile.is_private ? "Private profile" : "Public contributions"}
        />

        <div className="max-w-5xl mx-auto px-6 lg:px-10 pb-20 space-y-8">

          {/* Back button */}
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2 -mb-4 mt-2">
            <ArrowLeft size={14} /> Back
          </Button>

          {/* ── Hero Card ── */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative bg-card rounded-[28px] shadow-soft border border-border/50 overflow-hidden"
          >
            {/* Banner */}
            <div
              className="h-36 sm:h-48 relative overflow-hidden"
              style={
                profile.banner_url
                  ? { backgroundImage: `url(${profile.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                  : { background: "linear-gradient(135deg, hsl(235,45%,28%), hsl(235,35%,18%), hsl(42,85%,40%))" }
              }
            >
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/30" />
            </div>

            {/* Avatar + Identity */}
            <div className="px-6 lg:px-8 pb-6 bg-card relative">
              <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-14 sm:-mt-16">
                {/* Avatar */}
                <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-[24px] overflow-hidden bg-background border-4 border-card shadow-lg flex items-center justify-center flex-shrink-0 z-10">
                  {profile.profile_photo_url ? (
                    <img src={profile.profile_photo_url} alt={profile.full_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-display font-bold">
                      {(profile.full_name || "U").charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name / meta */}
                <div className="flex-1 pb-1 pt-4 sm:pt-0 sm:ml-2">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h1 className="text-2xl font-display font-bold text-foreground tracking-tight">
                      {profile.full_name}
                    </h1>
                    {profile.role === "admin" && (
                      <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
                        Admin
                      </span>
                    )}
                    {profile.role === "user" && (
                      <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                        Verified User
                      </span>
                    )}
                    {profile.is_private && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-[10px] font-bold uppercase tracking-wider border border-border">
                        <Lock size={9} /> Private
                      </span>
                    )}
                  </div>

                  {joinYear && (
                    <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                      <Calendar size={12} />
                      Member since {joinYear}
                    </p>
                  )}
                </div>

                {/* Actions: Copy Link */}
                <div className="pb-1 pt-4 sm:pt-0 flex items-center gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(window.location.href);
                      setCopySuccess(true);
                      setTimeout(() => setCopySuccess(false), 2000);
                    }}
                    variant="outline"
                    size="sm"
                    className="gap-2 rounded-xl border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all font-bold h-9"
                  >
                    <AnimatePresence mode="wait">
                      {copySuccess ? (
                        <motion.div
                          key="success"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2 text-green-500"
                        >
                          <CheckCircle2 size={14} />
                          <span className="text-[11px]">{t("Copied!")}</span>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="copy"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.8 }}
                          className="flex items-center gap-2"
                        >
                          <ExternalLink size={14} />
                          <span className="text-[11px]">{t("Share Profile")}</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── Private wall ── */}
          <AnimatePresence>
            {profile.is_private && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-[24px] border border-border/50 p-12 text-center shadow-sm"
              >
                <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4 text-muted-foreground">
                  <Lock size={28} />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">This profile is private</h2>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  This community member has chosen to keep their contributions private.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Public content ── */}
          {!profile.is_private && (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <StatCard label="Total Reports" value={profile.total_reports} icon={FileText} delay={0.05} />
                <StatCard label="Verified Reports" value={profile.verified_reports} icon={CheckCircle2} delay={0.1} />
                <StatCard label="Badges Earned" value={profile.badges?.length ?? 0} icon={Award} delay={0.15} className="col-span-2 sm:col-span-1" />
              </div>

              {/* Badges */}
              {profile.badges?.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="bg-card rounded-[24px] border border-border/50 p-6 shadow-sm"
                >
                  <h2 className="text-base font-display font-semibold text-foreground mb-4">Badges Earned</h2>
                  <div className="flex flex-wrap gap-3">
                    {profile.badges.map((badge) => {
                      const meta = BADGE_META[badge] || { icon: Shield, color: "bg-muted text-muted-foreground border-border" };
                      const Icon = meta.icon;
                      return (
                        <div
                          key={badge}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-medium ${meta.color}`}
                        >
                          <Icon size={14} />
                          {badge}
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Activity Feed / Reports */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card rounded-[24px] border border-border/50 p-6 shadow-sm"
              >
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-base font-display font-semibold text-foreground">
                    Verified Contributions
                    {profile.verified_reports > 0 && (
                      <span className="ml-2 text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {profile.verified_reports}
                      </span>
                    )}
                  </h2>
                  {(profile.recent_reports || []).length > 6 && (
                    <button
                      onClick={() => setShowAll((p) => !p)}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      {showAll ? "Show less" : `View all ${profile.recent_reports.length}`}
                    </button>
                  )}
                </div>

                {(profile.recent_reports || []).length === 0 ? (
                  <div className="py-14 text-center text-muted-foreground/50 flex flex-col items-center gap-3">
                    <FileText size={32} />
                    <p className="text-sm font-medium">No verified contributions yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {visibleReports.map((r) => {
                      const sevColor = SEVERITY_COLORS[(r.severity || "medium").toLowerCase()] || SEVERITY_COLORS.medium;
                      const date = r.date_occurred
                        ? new Date(r.date_occurred).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                        : r.created_at
                          ? new Date(r.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
                          : null;
                      return (
                        <div
                          key={r.id}
                          className="group flex flex-col gap-2 p-4 rounded-2xl bg-muted/30 border border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-all"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="capitalize text-sm font-semibold text-foreground">{r.crime_type}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border capitalize ${sevColor}`}>
                                {r.severity}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-muted-foreground/70 flex items-center gap-1 flex-shrink-0">
                              <Hash size={9} />{(r.id || "").slice(0, 8)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
                            {r.area_name && (
                              <span className="flex items-center gap-1">
                                <MapPin size={10} /> {r.area_name}
                              </span>
                            )}
                            {date && (
                              <span className="flex items-center gap-1">
                                <Clock size={10} /> {date}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${r.trust_score}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-bold text-green-500">{r.trust_score}/100</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </motion.div>
            </>
          )}
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
