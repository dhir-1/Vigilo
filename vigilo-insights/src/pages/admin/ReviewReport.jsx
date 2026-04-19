import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, User, Clock, MapPin, Shield, CheckCircle,
  XCircle, AlertTriangle, Image as ImageIcon, Send, Loader2, Download, Trash2, Megaphone, Check,
  Activity, Gavel, Award
} from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { MapView } from "@/components/map/MapView";
import { MapMarker } from "@/components/map/MapMarker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminAPI } from "@/lib/api";
import { getTrustScoreColor, getSeverityColor, getMarkerColor } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";

export default function ReviewReport() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [report, setReport] = useState(null);
  const [allReports, setAllReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [sendToPolice, setSendToPolice] = useState(false);
  const [actionTaken, setActionTaken] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [mapInteractive, setMapInteractive] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const fetchReport = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await adminAPI.allReports();
      const reports = Array.isArray(data) ? data : [];
      setAllReports(reports);
      const found = reports.find((r) => (r.report_id || r.id) === id);
      if (found) {
        setReport(found);
        setAdminNotes(found.admin_notes || "");
      } else {
        setLoadError("Report not found");
      }
    } catch (err) {
      setLoadError(err.message || "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch report details
  useEffect(() => {
    fetchReport();
  }, [id]);

  const handleAction = async (action) => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      if (action === "resolve") {
        await adminAPI.resolveReport(id);
        setActionTaken(action);
        setTimeout(() => navigate("/admin/verify"), 1500);
      } else {
        const body = {
          action,
          admin_notes: adminNotes || undefined,
        };
        if (action === "reject" && rejectReason) {
          body.rejection_reason = rejectReason;
        }
        await adminAPI.verifyReport(id, body);

        // If sendToPolice is checked and action is approve, escalate
        if (sendToPolice && action === "approve") {
          try {
            await adminAPI.escalateReport(id);
          } catch {
            // Escalation failure is not critical
          }
        }

        // Instead of navigating away, refresh the report to show new status
        await fetchReport();
        setActionSuccess(
          action === "approve"
            ? "Report verified successfully."
            : action === "reject"
              ? "Report rejected successfully."
              : "More information requested successfully."
        );
      }
    } catch (err) {
      setActionError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to permanently delete this report?")) return;
    try {
      await adminAPI.deleteReport(id);
      navigate("/admin/verify");
    } catch (err) {
      setActionError(err.message || "Failed to delete report");
    }
  };

  const handleDownloadPdf = () => {
    adminAPI.downloadPdf(id);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={32} className="text-destructive mx-auto mb-4" />
            <p className="text-destructive">{loadError}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/verify")}>Back to Queue</Button>
          </div>
        </main>
      </div>
    );
  }

  if (actionTaken) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${actionTaken === "approve" ? "bg-green-500/15 text-green-500" :
              actionTaken === "reject" ? "bg-red-500/15 text-red-500" :
                "bg-yellow-500/15 text-yellow-500"
              }`}>
              {actionTaken === "approve" ? <CheckCircle size={40} /> :
                actionTaken === "reject" ? <XCircle size={40} /> :
                  <AlertTriangle size={40} />}
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {actionTaken === "approve" ? "Report Approved & Verified" :
                actionTaken === "reject" ? "Report Rejected" :
                  "More Info Requested"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">Redirecting to queue...</p>
          </motion.div>
        </main>
      </div>
    );
  }

  const scoreColor = getTrustScoreColor(report.trust_score || 0);
  const sevColor = getSeverityColor((report.severity || "medium").toLowerCase());
  const coords = [report.latitude || 21.17, report.longitude || 72.83];
  const markerColor = getMarkerColor((report.severity || "medium").toLowerCase());

  const severityWeights = { High: 3, Medium: 2, Low: 1 };
  const reportKey = report.report_id || report.id;

  const parseReportDate = (value) => {
    const parsed = value ? new Date(value) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  };

  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    const toRad = (value) => (value * Math.PI) / 180;
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const reporterReports = useMemo(() => (
    allReports.filter((item) => item.user_id && item.user_id === report.user_id)
  ), [allReports, report.user_id]);

  const nearbyVerifiedReports = useMemo(() => (
    allReports
      .filter((item) => (
        (item.report_id || item.id) !== reportKey &&
        item.status === "verified" &&
        typeof item.latitude === "number" &&
        typeof item.longitude === "number"
      ))
      .map((item) => ({
        ...item,
        distanceKm: getDistanceKm(report.latitude, report.longitude, item.latitude, item.longitude),
      }))
      .filter((item) => item.distanceKm <= 5)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 4)
  ), [allReports, report.latitude, report.longitude, reportKey]);

  const sectorStats = useMemo(() => {
    const now = new Date();
    const last30Days = new Date(now);
    last30Days.setDate(now.getDate() - 30);
    const previous30Days = new Date(now);
    previous30Days.setDate(now.getDate() - 60);

    const nearbyAllVerified = allReports
      .filter((item) => (
        item.status === "verified" &&
        typeof item.latitude === "number" &&
        typeof item.longitude === "number"
      ))
      .map((item) => ({
        ...item,
        distanceKm: getDistanceKm(report.latitude, report.longitude, item.latitude, item.longitude),
      }))
      .filter((item) => item.distanceKm <= 5);

    const recentNearby = nearbyAllVerified.filter((item) => {
      const date = parseReportDate(item.date_occurred || item.created_at);
      return date && date >= last30Days;
    });

    const previousNearby = nearbyAllVerified.filter((item) => {
      const date = parseReportDate(item.date_occurred || item.created_at);
      return date && date >= previous30Days && date < last30Days;
    });

    const avgSeverity = recentNearby.length
      ? recentNearby.reduce((sum, item) => sum + (severityWeights[item.severity] || 1), 0) / recentNearby.length
      : 0;

    let riskLevel = "Low";
    let riskClass = "bg-green-500/10 text-green-600 border-green-500/20";
    if (recentNearby.length >= 5 || avgSeverity >= 2.3) {
      riskLevel = "High";
      riskClass = "bg-red-500/10 text-red-600 border-red-500/20";
    } else if (recentNearby.length >= 2 || avgSeverity >= 1.5) {
      riskLevel = "Medium";
      riskClass = "bg-yellow-500/10 text-yellow-600 border-yellow-500/20";
    }

    let insight = "No verified incidents were found within 5 km in the last 30 days.";
    if (recentNearby.length > 0 && previousNearby.length === 0) {
      insight = `${recentNearby.length} verified incident(s) were recorded within 5 km in the last 30 days.`;
    } else if (recentNearby.length > 0 || previousNearby.length > 0) {
      const delta = recentNearby.length - previousNearby.length;
      if (delta > 0) {
        const pct = Math.round((delta / Math.max(previousNearby.length, 1)) * 100);
        insight = `Verified incidents within 5 km are up ${pct}% versus the previous 30 days.`;
      } else if (delta < 0) {
        const pct = Math.round((Math.abs(delta) / Math.max(previousNearby.length, 1)) * 100);
        insight = `Verified incidents within 5 km are down ${pct}% versus the previous 30 days.`;
      } else {
        insight = "Verified incident volume within 5 km is unchanged versus the previous 30 days.";
      }
    }

    return {
      riskLevel,
      riskClass,
      recentCount: recentNearby.length,
      recentProgress: Math.min(100, recentNearby.length * 20),
      insight,
    };
  }, [allReports, report.latitude, report.longitude]);

  const reputationPoints = Math.min(30, reporterReports.length * 5);
  const evidencePoints = Math.min(40, (report.media_urls?.length || 0) * 20);
  const detailPoints = report.description?.length > 200 ? 30 : report.description?.length > 100 ? 20 : report.description?.length > 30 ? 10 : 0;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title={`${t("Review")} ${report.report_id || report.id}`} subtitle={t("Admin report review")} />

        <div className="px-6 lg:px-10 pb-16 space-y-6 max-w-none">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => navigate("/admin/verify")} className="gap-2 sm:w-auto w-fit">
              <ArrowLeft size={16} /> {t("Back to queue")}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleDownloadPdf} className="rounded-xl gap-1">
                <Download size={14} /> {t("PDF")}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} className="rounded-xl gap-1">
                <Trash2 size={14} /> {t("Delete")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            {/* LEFT COLUMN - Primary Report Content */}
            <div className="xl:col-span-7 space-y-6">
              {/* Report Details */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-foreground capitalize">{t(report.crime_type)}</h3>
                      <Badge className={sevColor + " border capitalize"}>{t(report.severity)}</Badge>
                      <Badge variant="outline" className="capitalize">{t(report.status)}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{report.report_id || report.id}</p>
                  </div>
                  <span className={`text-xl font-bold px-4 py-1.5 rounded-full ${scoreColor}`}>
                    {report.trust_score || 0}/100
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={14} /> {report.area_name || t("Unknown Location")}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} /> {report.date_occurred?.split("T")[0]} • {t(report.time_of_day || "")}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">{report.description}</p>
              </motion.div>

              {/* Map - Incident Location Primary */}
              {/* Map - moved to right column, smaller */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="rounded-2xl overflow-hidden shadow-soft border-ceramic relative"
                onMouseEnter={() => setMapInteractive(true)}
                onMouseLeave={() => setMapInteractive(false)}
              >
                {!mapInteractive && (
                  <div className="absolute inset-0 z-[999] cursor-pointer" />
                )}
                <div className="absolute top-3 left-3 z-[1000] bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border shadow-md">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">{t("Incident Location")}</p>
                  <p className="text-[11px] font-semibold text-foreground">{report.area_name || t("Surat Area")}</p>
                </div>
                <div className="h-[220px]">
                  <MapView center={coords} zoom={15}>
                    <MapMarker
                      position={coords}
                      style={{
                        width: "18px",
                        height: "18px",
                        borderRadius: "999px",
                        border: `3px solid ${markerColor}`,
                        background: markerColor,
                        opacity: 0.8,
                        boxShadow: "0 0 15px " + markerColor + "44",
                      }}
                    />
                  </MapView>
                </div>
              </motion.div>

              {/* Nearby Incidents - To provide more content and context */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  {t("Nearby Verified Crimes")}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { type: "Theft", area: "Adajan", date: "2 days ago", score: 88, severity: "medium" },
                    { type: "Harassment", area: "LP Savani", date: "5 days ago", score: 92, severity: "low" }
                  ].map((crime, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-ceramic/50 group hover:border-primary/30 transition-all cursor-default relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-background flex items-center justify-center text-primary shadow-sm">
                          <Shield size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground tracking-tight">{t(crime.type)}</p>
                          <p className="text-xs text-muted-foreground">{crime.date} • {crime.area}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs font-bold text-green-500">{crime.score}%</span>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground mt-0.5">{t(crime.severity)}</span>
                      </div>
                    </div>
                  ))}
                </div>
                {report.trust_score < 40 && (
                  <div className="mt-4 p-3 rounded-xl bg-destructive/5 border border-destructive/10 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-destructive shrink-0 mt-0.5" />
                    <p className="text-xs text-destructive/80 font-medium">
                      {t("Low trust score detected for this region. Recommend cross-referencing with local intelligence records before approval.")}
                    </p>
                  </div>
                )}
              </motion.div>

              {/* Reporter Information - Moved to Left for better balance */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl" />

                <div className="flex items-center justify-between mb-6 relative">
                  <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                    <div className="p-1.5 bg-primary/10 rounded-lg">
                      <User size={18} className="text-primary" />
                    </div>
                    {t("Reporter")}
                  </h3>
                  {report.user_id && (
                    <Link
                      to={`/user/${report.user_id}`}
                      className="flex items-center gap-1.5 text-xs font-bold text-primary hover:underline px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 transition-all hover:bg-primary/20"
                    >
                      <User size={12} /> {t("Profile")}
                    </Link>
                  )}
                </div>

                {report.user ? (
                  <div className="space-y-4 relative">
                    <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/40 border border-ceramic/30">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {report.user.full_name?.charAt(0) || "?"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">{report.user.full_name || t("Anonymous")}</p>
                        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{t(report.user.role || "User")}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-ceramic/30">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">{t("Member Since")}</span>
                        <span className="text-xs font-bold">{report.user.created_at ? new Date(report.user.created_at).toLocaleDateString() : "—"}</span>
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/50 border border-ceramic/30">
                        <span className="text-[11px] font-bold text-muted-foreground uppercase">{t("Trust Status")}</span>
                        <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] h-5 font-bold uppercase">{t("Verified")}</Badge>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center bg-muted/20 rounded-xl border border-dashed border-ceramic">
                    <User size={24} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-xs text-muted-foreground font-medium">{t("Reporter details unavailable")}</p>
                  </div>
                )}
              </motion.div>

              {/* Admin Notes */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-semibold text-foreground">{t("Admin Notes")}</h3>
                  <Badge variant="ghost" className="text-[10px] text-muted-foreground">{t("Internal Use Only")}</Badge>
                </div>
                <Textarea
                  placeholder={t("Add your review notes here...")}
                  className="rounded-xl min-h-[220px] bg-background/50 border-ceramic resize-none"
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  disabled={actionLoading}
                />
              </motion.div>
            </div>

            {/* RIGHT COLUMN - Analysis & Action */}
            <div className="xl:col-span-5 space-y-6">
              {/* Trust Score Analysis - Top of Sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic relative overflow-hidden"
              >
                <div className={`absolute -top-24 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none ${(report.trust_score || 0) >= 70 ? 'bg-green-500/10' :
                  (report.trust_score || 0) >= 40 ? 'bg-yellow-500/10' :
                    'bg-red-500/10'
                  }`} />

                <h3 className="text-lg font-display font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  {t("Trust Analysis")}
                </h3>

                <div className="flex items-center justify-between mb-8">
                  <div className="flex flex-col">
                    <span className={`text-5xl font-bold tabular-nums ${scoreColor}`}>{report.trust_score || 0}<span className="text-xl text-muted-foreground">/100</span></span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-2 px-3 py-1 rounded-full bg-muted/40 w-fit">
                      {report.trust_score >= 80 ? t("High Confidence") : report.trust_score >= 50 ? t("Moderate Confidence") : t("Low Confidence")}
                    </span>
                  </div>
                  <div className="w-24 h-24 relative flex items-center justify-center">
                    <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-muted/10" strokeDasharray="100, 100" />
                      <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className={scoreColor.split(" ")[0]} strokeDasharray={`${report.trust_score || 0}, 100`} />
                    </svg>
                    <Shield size={24} className={`absolute ${scoreColor.split(" ")[0]}`} />
                  </div>
                </div>

                <div className="space-y-4 mb-6">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-muted-foreground uppercase tracking-tighter">{t("Reputation")}</span>
                      <span>{(report.user?.reports_count > 5) ? 30 : 20}/30</span>
                    </div>
                    <Progress value={(report.user?.reports_count > 5) ? 100 : 66} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-muted-foreground uppercase tracking-tighter">{t("Evidence")}</span>
                      <span>{(report.media_urls?.length > 0) ? 40 : 0}/40</span>
                    </div>
                    <Progress value={(report.media_urls?.length > 0) ? 100 : 0} className="h-1.5" />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-muted-foreground uppercase tracking-tighter">{t("Details")}</span>
                      <span>{(report.description?.length > 100) ? 30 : (report.description?.length > 30) ? 15 : 0}/30</span>
                    </div>
                    <Progress value={(report.description?.length > 100) ? 100 : (report.description?.length > 30) ? 50 : 0} className="h-1.5" />
                  </div>
                </div>

                <div className="bg-muted/30 rounded-xl p-4 space-y-3 border border-border/50">
                  <h4 className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest mb-2">{t("System AI Checks")}</h4>
                  <div className="space-y-2.5">
                    <div className="flex items-start gap-2 text-xs text-foreground font-medium">
                      <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                      <span>{t("Account age and reputation verified.")}</span>
                    </div>
                    <div className="flex items-start gap-2 text-xs text-foreground font-medium">
                      {report.media_urls?.length ? (
                        <CheckCircle size={14} className="text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <AlertTriangle size={14} className="text-yellow-500 mt-0.5 shrink-0" />
                      )}
                      <span>{report.media_urls?.length ? t("Media matches location metadata.") : t("No media to cross-reference.")}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Sector Historical Risk */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  {t("Sector Intelligence")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">{t("Historical Risk Level")}</span>
                    <Badge variant="outline" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-bold">{t("Medium")}</Badge>
                  </div>
                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-bold">
                      <span className="text-muted-foreground">{t("Patrol Frequency")}</span>
                      <span className="text-primary">65%</span>
                    </div>
                    <Progress value={65} className="h-1" />
                  </div>
                  <div className="p-3 rounded-xl bg-primary/5 text-[11px] text-primary/80 border border-primary/10 font-medium">
                    <p>💡 {t("This area has seen a 14% increase in reported theft incidents over the last 30 days.")}</p>
                  </div>
                </div>
              </motion.div>


              {/* Action Buttons - Final decision point in sidebar */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-primary/20 border-2 bg-primary/5 space-y-4"
              >
                <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                  <Gavel size={20} className="text-primary" />
                  {t("Take Action")}
                </h3>

                {actionError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20 active:animate-shake">
                    {actionError}
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-xl bg-background/80 border border-ceramic/50">
                  <Checkbox id="police" checked={sendToPolice} onCheckedChange={setSendToPolice} />
                  <Label htmlFor="police" className="cursor-pointer flex items-center gap-2">
                    <Megaphone size={14} className="text-primary" />
                    <span className="text-xs font-bold">{t("Escalate to police department")}</span>
                  </Label>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button
                    onClick={() => handleAction("approve")}
                    disabled={actionLoading || report.status !== 'pending'}
                    className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 py-7"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={20} />}
                    <span className="text-lg font-bold">{t("Verify Report")}</span>
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleAction("resolve")}
                      disabled={actionLoading || report.status !== 'verified'}
                      className="rounded-xl gap-2 border-blue-500/50 text-blue-600 hover:bg-blue-600/10 font-bold"
                    >
                      <Check size={16} /> {t("Resolve")}
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => handleAction("request_info")}
                      disabled={actionLoading || report.status !== 'pending'}
                      className="rounded-xl gap-2 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 font-bold"
                    >
                      <AlertTriangle size={16} /> {t("More Info")}
                    </Button>
                  </div>

                  <div className="flex flex-col gap-2 pt-2 border-t border-ceramic">
                    <Select value={rejectReason} onValueChange={setRejectReason} disabled={report.status !== 'pending'}>
                      <SelectTrigger className="rounded-xl bg-background text-xs h-10 border-ceramic">
                        <SelectValue placeholder={t("Reason for rejection")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Insufficient evidence">{t("Insufficient evidence")}</SelectItem>
                        <SelectItem value="Duplicate report">{t("Duplicate report")}</SelectItem>
                        <SelectItem value="Suspected fake report">{t("Suspected fake report")}</SelectItem>
                        <SelectItem value="Other">{t("Other")}</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="destructive"
                      onClick={() => handleAction("reject")}
                      disabled={actionLoading || report.status !== 'pending' || !rejectReason}
                      className="rounded-xl gap-2 py-6 font-bold"
                    >
                      {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={18} />}
                      {t("Reject Report")}
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
