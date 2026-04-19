import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Download, AlertCircle, CheckCircle, Clock, MapPin, Shield, Loader2, Edit3, Save, X, Users } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { reportsAPI } from "@/lib/api";
import { getStatusColor, getTrustScoreColor, getSeverityColor } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";

export default function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    reportsAPI.myReports()
      .then((data) => {
        const reports = Array.isArray(data) ? data : [];
        const found = reports.find((r) => (r.report_id || r.id) === id);
        if (found) {
          setReport(found);
          setEditDesc(found.description || "");
        } else {
          setError("Report not found");
        }
      })
      .catch((err) => setError(err.message || "Failed to load report"))
      .finally(() => setIsLoading(false));
  }, [id]);

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

  if (error || !report) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle size={32} className="text-destructive mx-auto mb-4" />
            <p className="text-destructive">{error || "Report not found"}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/my-reports")}>Back to Reports</Button>
          </div>
        </main>
      </div>
    );
  }

  // Map API field names to display-friendly fields
  const displayReport = {
    id: report.report_id || report.id,
    crimeType: report.crime_type || "Unknown",
    severity: (report.severity || "medium").toLowerCase(),
    location: report.area_name || "Unknown",
    date: report.date_occurred?.split("T")[0] || "",
    time: report.time_of_day || "",
    status: (report.status || "pending").toLowerCase(),
    trustScore: report.trust_score || 0,
    description: report.description || "",
    communityConfirmationCount: report.community_confirmation_count || 0,
    communityTrustBoost: report.community_trust_boost || 0,
  };

  const statusColor = getStatusColor(displayReport.status);
  const scoreColor = getTrustScoreColor(displayReport.trustScore);
  const sevColor = getSeverityColor(displayReport.severity);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title={`Report ${displayReport.id}`} subtitle="View full report details" />

        <div className="px-6 lg:px-10 pb-16 space-y-6 max-w-4xl">
          {/* Back button */}
          <div className="flex justify-between">
            <Button variant="ghost" onClick={() => navigate("/my-reports")} className="gap-2">
              <ArrowLeft size={16} /> Back to reports
            </Button>
            <Button variant="outline" onClick={() => reportsAPI.downloadPdf(displayReport.id)} className="gap-2">
              <Download size={16} /> Download PDF
            </Button>
          </div>

          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-xl font-bold text-foreground capitalize">{displayReport.crimeType}</h2>
                  <Badge className={statusColor + " border capitalize"}>{displayReport.status}</Badge>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{displayReport.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-lg font-bold px-3 py-1 rounded-full ${scoreColor}`}>
                  {displayReport.trustScore}/100
                </span>
                <Badge className={sevColor + " border capitalize"}>{displayReport.severity}</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin size={14} />
                <span>{displayReport.location}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock size={14} />
                <span>{displayReport.date} {displayReport.time && `• ${displayReport.time}`}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Shield size={14} />
                <span>Trust Score: {displayReport.trustScore}</span>
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-border/60 bg-background/50 px-4 py-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users size={14} />
                <span>Community confirmations</span>
              </div>
              <div className="text-right">
                <div className="font-semibold text-foreground">{displayReport.communityConfirmationCount}</div>
                {displayReport.communityTrustBoost > 0 && (
                  <div className="text-[11px] text-green-500">+{displayReport.communityTrustBoost} trust boost</div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Admin notes if info_requested */}
          {displayReport.status === "info_requested" && report.admin_notes && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-yellow-500/5 rounded-2xl p-6 border border-yellow-500/20 mb-6"
            >
              <h3 className="text-lg font-display font-semibold text-yellow-600 mb-2">{t("More Info Requested")}</h3>
              <p className="text-sm text-muted-foreground">{report.admin_notes}</p>
            </motion.div>
          )}

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-display font-semibold text-foreground">{t("Description")}</h3>
              {displayReport.status === "info_requested" && !isEditing && !saveSuccess && (
                <Button variant="outline" size="sm" onClick={() => setIsEditing(true)} className="gap-2 rounded-xl border-primary text-primary hover:bg-primary/10">
                  <Edit3 size={14} /> {t("Provide Info")}
                </Button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4 mt-4">
                <Textarea 
                  value={editDesc} 
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="rounded-xl min-h-[120px] bg-background"
                  placeholder={t("Provide additional details related to your report...")}
                />
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={() => setIsEditing(false)} disabled={isSaving} className="rounded-xl">
                    <X size={16} className="mr-2"/> {t("Cancel")}
                  </Button>
                  <Button 
                    onClick={async () => {
                      setIsSaving(true);
                      setError(null);
                      try {
                        const updated = await reportsAPI.update(displayReport.id, { description: editDesc });
                        setReport(updated);
                        setIsEditing(false);
                        setSaveSuccess(true);
                        setTimeout(() => setSaveSuccess(false), 5000);
                      } catch (err) {
                        setError(err.message || "Failed to save update");
                      } finally {
                        setIsSaving(false);
                      }
                    }} 
                    disabled={isSaving}
                    className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin mr-2"/> : <Save size={16} className="mr-2" />}
                    {t("Save Updates")}
                  </Button>
                </div>
              </div>
            ) : (
               <>
                 <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{displayReport.description}</p>
                 {saveSuccess && (
                   <div className="mt-4 p-3 rounded-xl bg-green-500/10 text-green-500 text-sm flex items-center gap-2">
                     <CheckCircle size={16} /> {t("Your additional information was saved and sent for review.")}
                   </div>
                 )}
               </>
            )}
          </motion.div>

          {/* Rejection reason if rejected */}
          {displayReport.status === "rejected" && report.rejection_reason && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-red-500/5 rounded-2xl p-6 border border-red-500/20"
            >
              <h3 className="text-lg font-display font-semibold text-red-500 mb-2">{t("Rejection Reason")}</h3>
              <p className="text-sm text-muted-foreground">{report.rejection_reason}</p>
            </motion.div>
          )}
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
