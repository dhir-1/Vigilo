import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle,
  Clock,
  Download,
  Gavel,
  Loader2,
  MapPin,
  Megaphone,
  Shield,
  Trash2,
  User,
  XCircle,
} from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { MapMarker } from "@/components/map/MapMarker";
import { MapView } from "@/components/map/MapView";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { adminAPI } from "@/lib/api";
import { getMarkerColor, getSeverityColor, getTrustScoreColor } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";

const severityWeights = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function parseDate(value) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function ReviewReportPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [report, setReport] = useState(null);
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [sendToPolice, setSendToPolice] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const loadReport = async () => {
    setIsLoading(true);
    setLoadError("");

    try {
      const data = await adminAPI.allReports();
      const items = Array.isArray(data) ? data : [];
      const found = items.find((item) => (item.report_id || item.id) === id);

      setReports(items);

      if (!found) {
        setLoadError("Report not found");
        return;
      }

      setReport(found);
      setAdminNotes(found.admin_notes || "");
    } catch (err) {
      setLoadError(err.message || "Failed to load report");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, [id]);

  const derived = useMemo(() => {
    if (!report) return null;

    const reportKey = report.report_id || report.id;
    const reporterReports = reports.filter(
      (item) => item.user_id && item.user_id === report.user_id,
    );

    const nearbyVerified = reports
      .filter(
        (item) =>
          (item.report_id || item.id) !== reportKey &&
          item.status === "verified" &&
          typeof item.latitude === "number" &&
          typeof item.longitude === "number",
      )
      .map((item) => ({
        ...item,
        distanceKm: distanceKm(report.latitude, report.longitude, item.latitude, item.longitude),
      }))
      .filter((item) => item.distanceKm <= 5)
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 4);

    const now = new Date();
    const last30 = new Date(now);
    last30.setDate(now.getDate() - 30);
    const prev30 = new Date(now);
    prev30.setDate(now.getDate() - 60);

    const sectorReports = reports
      .filter(
        (item) =>
          item.status === "verified" &&
          typeof item.latitude === "number" &&
          typeof item.longitude === "number",
      )
      .map((item) => ({
        ...item,
        distanceKm: distanceKm(report.latitude, report.longitude, item.latitude, item.longitude),
      }))
      .filter((item) => item.distanceKm <= 5);

    const recent = sectorReports.filter((item) => {
      const date = parseDate(item.date_occurred || item.created_at);
      return date && date >= last30;
    });

    const previous = sectorReports.filter((item) => {
      const date = parseDate(item.date_occurred || item.created_at);
      return date && date >= prev30 && date < last30;
    });

    const avgSeverity = recent.length
      ? recent.reduce((sum, item) => sum + (severityWeights[item.severity] || 1), 0) / recent.length
      : 0;

    const riskLevel =
      recent.length >= 5 || avgSeverity >= 2.3
        ? "High"
        : recent.length >= 2 || avgSeverity >= 1.5
          ? "Medium"
          : "Low";

    const riskClass =
      riskLevel === "High"
        ? "bg-red-500/10 text-red-600 border-red-500/20"
        : riskLevel === "Medium"
          ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
          : "bg-green-500/10 text-green-600 border-green-500/20";

    const insight =
      recent.length === 0
        ? "No verified incidents were found within 5 km in the last 30 days."
        : previous.length === 0
          ? `${recent.length} verified incident(s) were recorded within 5 km in the last 30 days.`
          : recent.length > previous.length
            ? `Verified incidents within 5 km are up ${Math.round(((recent.length - previous.length) / Math.max(previous.length, 1)) * 100)}% versus the previous 30 days.`
            : recent.length < previous.length
              ? `Verified incidents within 5 km are down ${Math.round(((previous.length - recent.length) / Math.max(previous.length, 1)) * 100)}% versus the previous 30 days.`
              : "Verified incident volume within 5 km is unchanged versus the previous 30 days.";

    return {
      nearbyVerified,
      reporterReports,
      reputationPoints: Math.min(30, reporterReports.length * 5),
      evidencePoints: Math.min(40, (report.media_urls?.length || 0) * 20),
      detailPoints:
        report.description?.length > 200
          ? 30
          : report.description?.length > 100
            ? 20
            : report.description?.length > 30
              ? 10
              : 0,
      sector: {
        riskLevel,
        riskClass,
        recentCount: recent.length,
        recentProgress: Math.min(100, recent.length * 20),
        insight,
      },
    };
  }, [report, reports]);

  const handleAction = async (action) => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");

    try {
      if (action === "resolve") {
        await adminAPI.resolveReport(id);
        navigate("/admin/verify");
        return;
      }

      const payload = {
        action,
        admin_notes: adminNotes || undefined,
      };

      if (action === "reject") {
        payload.rejection_reason = rejectReason;
      }

      await adminAPI.verifyReport(id, payload);

      if (sendToPolice && action === "approve") {
        await adminAPI.escalateReport(id).catch(() => {});
      }

      await loadReport();
      setActionSuccess(
        action === "approve"
          ? "Report verified successfully."
          : action === "reject"
            ? "Report rejected successfully."
            : "More information requested successfully.",
      );
    } catch (err) {
      setActionError(err.message || "Action failed");
    } finally {
      setActionLoading(false);
    }
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

  if (loadError || !report || !derived) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle size={32} className="text-destructive mx-auto mb-4" />
            <p className="text-destructive">{loadError || "Report not found"}</p>
            <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/verify")}>
              Back to Queue
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const scoreColor = getTrustScoreColor(report.trust_score || 0);
  const sevColor = getSeverityColor((report.severity || "medium").toLowerCase());
  const markerColor = getMarkerColor((report.severity || "medium").toLowerCase());
  const coords = [report.latitude || 21.17, report.longitude || 72.83];
  const reportKey = report.report_id || report.id;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        <Navbar title={`${t("Review")} ${reportKey}`} subtitle={t("Admin report review")} />

        <div className="px-6 lg:px-10 pb-16 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/admin/verify")}
              className="gap-2 sm:w-auto w-fit"
            >
              <ArrowLeft size={16} />
              {t("Back to queue")}
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => adminAPI.downloadPdf(id)}
                className="rounded-xl gap-1"
              >
                <Download size={14} />
                {t("PDF")}
              </Button>

              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  if (window.confirm("Are you sure you want to permanently delete this report?")) {
                    await adminAPI.deleteReport(id);
                    navigate("/admin/verify");
                  }
                }}
                className="rounded-xl gap-1"
              >
                <Trash2 size={14} />
                {t("Delete")}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
            <div className="xl:col-span-7 space-y-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-xl font-bold text-foreground capitalize">
                        {t(report.crime_type)}
                      </h3>
                      <Badge className={`${sevColor} border capitalize`}>{t(report.severity)}</Badge>
                      <Badge variant="outline" className="capitalize">
                        {t(report.status)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{reportKey}</p>
                  </div>

                  <span className={`text-xl font-bold px-4 py-1.5 rounded-full ${scoreColor}`}>
                    {report.trust_score || 0}/100
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin size={14} />
                    {report.area_name || t("Unknown Location")}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock size={14} />
                    {report.date_occurred?.split("T")[0]} - {t(report.time_of_day || "")}
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed italic border-l-2 border-primary/20 pl-4 py-1">
                  {report.description}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl overflow-hidden shadow-soft border-ceramic relative"
              >
                <div className="absolute top-3 left-3 z-10 bg-card/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-border shadow-md">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                    {t("Incident Location")}
                  </p>
                  <p className="text-[11px] font-semibold text-foreground">
                    {report.area_name || t("Surat Area")}
                  </p>
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
                        boxShadow: `0 0 15px ${markerColor}44`,
                      }}
                    />
                  </MapView>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <h3 className="text-lg font-display font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  {t("Nearby Verified Crimes")}
                </h3>

                {derived.nearbyVerified.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {derived.nearbyVerified.map((item) => (
                      <button
                        key={item.report_id || item.id}
                        type="button"
                        onClick={() => navigate(`/admin/verify/${item.report_id || item.id}`)}
                        className="flex items-center justify-between p-4 rounded-xl bg-muted/30 border border-ceramic/50 group hover:border-primary/30 transition-all text-left"
                      >
                        <div>
                          <p className="text-sm font-bold text-foreground tracking-tight">
                            {t(item.crime_type)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.distanceKm.toFixed(1)} km away - {item.area_name || t("Unknown Location")}
                          </p>
                        </div>
                        <span className="text-xs font-bold text-green-500">
                          {item.trust_score || 0}%
                        </span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {t("No nearby verified reports were found within 5 km.")}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                    <User size={18} className="text-primary" />
                    {t("Reporter")}
                  </h3>
                  {report.user_id && (
                    <Link
                      to={`/user/${report.user_id}`}
                      className="text-xs font-bold text-primary hover:underline"
                    >
                      {t("Profile")}
                    </Link>
                  )}
                </div>

                {report.user ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="font-bold text-foreground">{report.user.full_name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {t(report.user.role || "User")}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl bg-muted/30">
                      <p className="text-xs text-muted-foreground uppercase mb-1">
                        {t("Reports Submitted")}
                      </p>
                      <p className="font-bold text-foreground">{derived.reporterReports.length}</p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                    {t("Reporter details unavailable")}
                  </div>
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-display font-semibold text-foreground">
                    {t("Admin Notes")}
                  </h3>
                  <Badge variant="ghost" className="text-[10px] text-muted-foreground">
                    {t("Internal Use Only")}
                  </Badge>
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

            <div className="xl:col-span-5 space-y-6">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <h3 className="text-lg font-display font-semibold text-foreground mb-6 flex items-center gap-2">
                  <Shield size={20} className="text-primary" />
                  {t("Trust Analysis")}
                </h3>

                <div className="text-5xl font-bold mb-6">
                  <span className={scoreColor.split(" ")[0]}>{report.trust_score || 0}</span>
                  <span className="text-xl text-muted-foreground">/100</span>
                </div>

                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-muted-foreground uppercase tracking-tighter">
                        {t("Reputation")}
                      </span>
                      <span>{derived.reputationPoints}/30</span>
                    </div>
                    <Progress value={Math.round((derived.reputationPoints / 30) * 100)} className="h-1.5" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-muted-foreground uppercase tracking-tighter">
                        {t("Evidence")}
                      </span>
                      <span>{derived.evidencePoints}/40</span>
                    </div>
                    <Progress value={Math.round((derived.evidencePoints / 40) * 100)} className="h-1.5" />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1.5 font-bold">
                      <span className="text-muted-foreground uppercase tracking-tighter">
                        {t("Details")}
                      </span>
                      <span>{derived.detailPoints}/30</span>
                    </div>
                    <Progress value={Math.round((derived.detailPoints / 30) * 100)} className="h-1.5" />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
              >
                <h3 className="text-sm font-semibold text-foreground mb-4 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={16} className="text-primary" />
                  {t("Sector Intelligence")}
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground font-medium">
                      {t("Historical Risk Level")}
                    </span>
                    <Badge variant="outline" className={`font-bold ${derived.sector.riskClass}`}>
                      {t(derived.sector.riskLevel)}
                    </Badge>
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] mb-1.5 font-bold">
                      <span className="text-muted-foreground">
                        {t("Verified reports in last 30 days")}
                      </span>
                      <span className="text-primary">{derived.sector.recentCount}</span>
                    </div>
                    <Progress value={derived.sector.recentProgress} className="h-1" />
                  </div>

                  <div className="p-3 rounded-xl bg-primary/5 text-[11px] text-primary/80 border border-primary/10 font-medium">
                    {t(derived.sector.insight)}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-card rounded-2xl p-6 shadow-soft border-primary/20 border-2 bg-primary/5 space-y-4"
              >
                <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                  <Gavel size={20} className="text-primary" />
                  {t("Take Action")}
                </h3>

                {actionError && (
                  <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-[11px] font-bold border border-destructive/20">
                    {actionError}
                  </div>
                )}

                {actionSuccess && (
                  <div className="p-3 rounded-xl bg-green-500/10 text-green-600 text-[11px] font-bold border border-green-500/20">
                    {actionSuccess}
                  </div>
                )}

                <div className="flex items-center gap-2 p-3 rounded-xl bg-background/80 border border-ceramic/50">
                  <Checkbox
                    id="police"
                    checked={sendToPolice}
                    onCheckedChange={(checked) => setSendToPolice(checked === true)}
                  />
                  <Label htmlFor="police" className="cursor-pointer flex items-center gap-2">
                    <Megaphone size={14} className="text-primary" />
                    <span className="text-xs font-bold">
                      {t("Escalate to police department")}
                    </span>
                  </Label>
                </div>

                <Button
                  onClick={() => handleAction("approve")}
                  disabled={actionLoading || report.status !== "pending"}
                  className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20 py-7"
                >
                  {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle size={20} />}
                  <span className="text-lg font-bold">{t("Verify Report")}</span>
                </Button>

                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => handleAction("resolve")}
                    disabled={actionLoading || report.status !== "verified"}
                    className="rounded-xl gap-2 border-blue-500/50 text-blue-600 hover:bg-blue-600/10 font-bold"
                  >
                    <Check size={16} />
                    {t("Resolve")}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => handleAction("request_info")}
                    disabled={actionLoading || report.status !== "pending"}
                    className="rounded-xl gap-2 border-yellow-500/50 text-yellow-600 hover:bg-yellow-500/10 font-bold"
                  >
                    <AlertTriangle size={16} />
                    {t("More Info")}
                  </Button>
                </div>

                <div className="flex flex-col gap-2 pt-2 border-t border-ceramic">
                  <Select
                    value={rejectReason}
                    onValueChange={setRejectReason}
                    disabled={report.status !== "pending"}
                  >
                    <SelectTrigger className="rounded-xl bg-background text-xs h-10 border-ceramic">
                      <SelectValue placeholder={t("Reason for rejection")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Insufficient evidence">
                        {t("Insufficient evidence")}
                      </SelectItem>
                      <SelectItem value="Duplicate report">{t("Duplicate report")}</SelectItem>
                      <SelectItem value="Suspected fake report">
                        {t("Suspected fake report")}
                      </SelectItem>
                      <SelectItem value="Other">{t("Other")}</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button
                    variant="destructive"
                    onClick={() => handleAction("reject")}
                    disabled={actionLoading || report.status !== "pending" || !rejectReason}
                    className="rounded-xl gap-2 py-6 font-bold"
                  >
                    {actionLoading ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={18} />}
                    {t("Reject Report")}
                  </Button>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
