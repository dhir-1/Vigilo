import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, SortAsc, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { ReportCard } from "@/components/reports/ReportCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportsAPI } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

export default function MyReports() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("date");

  // Fetch user's reports from API
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    reportsAPI.myReports()
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Failed to load reports"))
      .finally(() => setIsLoading(false));
  }, []);

  // Map API response fields to what ReportCard expects
  const mappedReports = useMemo(() => {
    return reports.map((r) => ({
      id: r.report_id || r.id,
      crimeType: r.crime_type?.toLowerCase()?.replace(/\s/g, "_") || "other",
      severity: r.severity?.toLowerCase() || "medium",
      location: r.area_name || "Unknown",
      date: r.date_occurred?.split("T")[0] || "",
      time: r.time_of_day || "",
      status: r.status?.toLowerCase() || "pending",
      trustScore: r.trust_score || 0,
      description: r.description || "",
      communityConfirmationCount: r.community_confirmation_count || 0,
    }));
  }, [reports]);

  const filtered = useMemo(() => {
    let list = [...mappedReports];
    if (statusFilter !== "all") {
      list = list.filter((r) => r.status === statusFilter);
    }
    list.sort((a, b) => {
      if (sortBy === "date") return new Date(b.date) - new Date(a.date);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      if (sortBy === "trust") return b.trustScore - a.trustScore;
      return 0;
    });
    return list;
  }, [mappedReports, statusFilter, sortBy]);

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title={t("My Reports")} subtitle={`${reports.length} ${t("reports submitted")}`} />

        <div className="px-6 lg:px-10 pb-16 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="rounded-xl">
                <TabsTrigger value="all" className="rounded-lg">{t("All")}</TabsTrigger>
                <TabsTrigger value="pending" className="rounded-lg">{t("Pending")}</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-lg">{t("Verified")}</TabsTrigger>
                <TabsTrigger value="rejected" className="rounded-lg">{t("Rejected")}</TabsTrigger>
                <TabsTrigger value="info_requested" className="rounded-lg">{t("Info Requested")}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <SortAsc size={16} className="text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">{t("Date")}</SelectItem>
                  <SelectItem value="status">{t("Status")}</SelectItem>
                  <SelectItem value="trust">{t("Trust Score")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Report Cards */}
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 size={32} className="text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t("Loading your reports...")}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={48} className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">{t("No reports found")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((report, i) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <ReportCard report={report} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
