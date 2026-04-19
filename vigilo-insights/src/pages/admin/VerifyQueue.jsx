import { useState, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { SortAsc, FileText, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { VerificationCard } from "@/components/admin/VerificationCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { adminAPI } from "@/lib/api";
import { useTranslation } from "@/lib/i18n";

export default function VerifyQueue() {
  const { t } = useTranslation();
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [secondaryFilter, setSecondaryFilter] = useState("all");
  const [sortBy, setSortBy] = useState("trust-asc");

  // Fetch all reports from API
  useEffect(() => {
    setIsLoading(true);
    adminAPI.allReports()
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message || "Failed to load reports"))
      .finally(() => setIsLoading(false));
  }, []);

  const filteredReports = useMemo(() => {
    // 1. Filter by status tab
    let list = reports.filter(r => r.status === statusFilter);

    // 2. Apply secondary filters
    if (secondaryFilter === "sos") {
      list = list.filter((r) => r.is_sos === true);
    } else if (secondaryFilter === "low-trust") {
      list = list.filter((r) => (r.trust_score || 0) < 50);
    } else if (secondaryFilter === "high-trust") {
      list = list.filter((r) => (r.trust_score || 0) > 80);
    }

    list.sort((a, b) => {
      if (sortBy === "trust-asc") return (a.trust_score || 0) - (b.trust_score || 0);
      if (sortBy === "trust-desc") return (b.trust_score || 0) - (a.trust_score || 0);
      if (sortBy === "date") return new Date(b.date_occurred || 0) - new Date(a.date_occurred || 0);
      if (sortBy === "severity") {
        const sevOrder = { High: 0, Medium: 1, Low: 2 };
        return (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2);
      }
      return 0;
    });

    return list;
  }, [reports, statusFilter, secondaryFilter, sortBy]);

  // Map API fields to what VerificationCard expects
  const mapReport = (r) => ({
    id: r.report_id || r.id,
    crimeType: r.crime_type?.toLowerCase()?.replace(/\s/g, "_") || "other",
    severity: r.severity?.toLowerCase() || "medium",
    location: r.area_name || "Unknown",
    date: r.date_occurred?.split("T")[0] || "",
    time: r.time_of_day || "",
    status: r.status?.toLowerCase() || "pending",
    trustScore: r.trust_score || 0,
    description: r.description || "",
    coordinates: [r.latitude || 21.17, r.longitude || 72.83],
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title={t("Verification Queue")} subtitle={`${filteredReports.length} ${t("reports awaiting review")}`} />

        <div className="px-6 lg:px-10 pb-16 space-y-6">
          {error && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {error}
            </div>
          )}

          {/* Status Tabs */}
          <div className="space-y-4">
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="rounded-xl w-full sm:w-auto">
                <TabsTrigger value="pending" className="rounded-lg px-8">{t("Pending")}</TabsTrigger>
                <TabsTrigger value="verified" className="rounded-lg px-8">{t("Verified")}</TabsTrigger>
                <TabsTrigger value="resolved" className="rounded-lg px-8">{t("Resolved")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Controls */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Tabs value={secondaryFilter} onValueChange={setSecondaryFilter}>
              <TabsList className="rounded-xl">
                <TabsTrigger value="all" className="rounded-lg">{t("All")}</TabsTrigger>
                <TabsTrigger value="sos" className="rounded-lg">🚨 {t("SOS Area")}</TabsTrigger>
                <TabsTrigger value="low-trust" className="rounded-lg">{t("Low Trust")}</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <SortAsc size={16} className="text-muted-foreground" />
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="rounded-xl w-48"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="trust-asc">{t("Trust Score (Low→High)")}</SelectItem>
                  <SelectItem value="trust-desc">{t("Trust Score (High→Low)")}</SelectItem>
                  <SelectItem value="date">{t("Date (Newest)")}</SelectItem>
                  <SelectItem value="severity">{t("Severity (Highest)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Cards */}
          {isLoading ? (
            <div className="text-center py-16">
              <Loader2 size={32} className="text-primary animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">{t("Loading pending reports...")}</p>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={48} className="text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">{t("No pending reports match your filters")}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredReports.map((report, i) => (
                <motion.div
                  key={report.report_id || report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                >
                  <VerificationCard report={mapReport(report)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
