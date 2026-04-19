import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { FileText, AlertTriangle, CheckCircle, XCircle, Clock, TrendingUp, Users, ChevronRight, Shield, Loader2 } from "lucide-react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from "recharts";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { adminAPI } from "@/lib/api";

export default function AdminDashboard() {
  const [analytics, setAnalytics] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    adminAPI.analytics()
      .then((data) => setAnalytics(data))
      .catch((err) => setError(err.message || "Failed to load analytics"))
      .finally(() => setIsLoading(false));
  }, []);

  const overviewCards = analytics ? [
    { label: "Pending Reports", value: analytics.pending?.toString() || "0", icon: FileText, color: "bg-yellow-500/15 text-yellow-600" },
    { label: "SOS Alerts", value: analytics.sos_alerts?.toString() || "0", icon: AlertTriangle, color: "bg-red-500/15 text-red-600" },
    { label: "Verified Reports", value: analytics.verified?.toString() || "0", icon: CheckCircle, color: "bg-green-500/15 text-green-600" },
    { label: "Total Users", value: analytics.total_users?.toString() || "0", icon: Users, color: "bg-blue-500/15 text-blue-600" },
  ] : [];

  // Build chart data from analytics
  const crimeTypeData = useMemo(() => {
    if (!analytics?.crime_types) return [];
    const colors = ["hsl(235,45%,38%)", "hsl(0,70%,58%)", "hsl(42,90%,55%)", "hsl(340,55%,65%)", "hsl(12,80%,55%)", "hsl(155,40%,50%)", "hsl(280,50%,55%)"];
    return Object.entries(analytics.crime_types).map(([name, count], i) => ({
      name,
      count,
      fill: colors[i % colors.length],
    }));
  }, [analytics]);

  const severityData = useMemo(() => {
    if (!analytics?.severities) return [];
    return Object.entries(analytics.severities).map(([name, count]) => ({
      name,
      count,
    }));
  }, [analytics]);

  const dailyTrend = useMemo(() => {
    if (!analytics?.daily_trend) return [];
    return analytics.daily_trend.map((d) => ({
      date: d.date?.split("-").slice(1).join("/") || d.date,
      count: d.count,
    }));
  }, [analytics]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 size={32} className="animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading analytics...</p>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertTriangle size={32} className="text-destructive mx-auto" />
            <p className="text-destructive">{error}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title="Admin Dashboard" subtitle="System overview & analytics" />

        <div className="px-6 lg:px-10 pb-16 space-y-6">
          {/* Overview Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {overviewCards.map((card, i) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i }}
                  className="bg-card rounded-2xl p-5 shadow-soft border-ceramic"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color}`}>
                      <Icon size={20} />
                    </div>
                    <span className="text-3xl font-bold tabular-nums text-foreground">{card.value}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground">{card.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Total + Rejected summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-card rounded-2xl p-5 shadow-soft border-ceramic flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                <FileText size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics?.total_reports || 0}</p>
                <p className="text-xs text-muted-foreground">Total Reports</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-5 shadow-soft border-ceramic flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/15 text-red-500 flex items-center justify-center">
                <XCircle size={24} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{analytics?.rejected || 0}</p>
                <p className="text-xs text-muted-foreground">Rejected Reports</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Crimes by Type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
            >
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">Reports by Type</h3>
              {crimeTypeData.length > 0 ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={crimeTypeData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,25%,88%)" />
                      <XAxis type="number" stroke="hsl(220,15%,50%)" fontSize={11} />
                      <YAxis type="category" dataKey="name" stroke="hsl(220,15%,50%)" fontSize={11} width={80} />
                      <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid hsl(35,25%,88%)" }} />
                      <Bar dataKey="count" radius={[0, 8, 8, 0]}>
                        {crimeTypeData.map((entry, index) => (
                          <Cell key={index} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </motion.div>

            {/* Severity Distribution */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
            >
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">Severity Distribution</h3>
              {severityData.length > 0 ? (
                <div style={{ height: 280 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={severityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,25%,88%)" />
                      <XAxis dataKey="name" stroke="hsl(220,15%,50%)" fontSize={11} />
                      <YAxis stroke="hsl(220,15%,50%)" fontSize={11} />
                      <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid hsl(35,25%,88%)" }} />
                      <Bar dataKey="count" fill="hsl(235,45%,38%)" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No data available</p>
              )}
            </motion.div>
          </div>

          {/* Daily Trend */}
          {dailyTrend.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic"
            >
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">Daily Report Trend</h3>
              <div style={{ height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(35,25%,88%)" />
                    <XAxis dataKey="date" stroke="hsl(220,15%,50%)" fontSize={11} />
                    <YAxis stroke="hsl(220,15%,50%)" fontSize={11} />
                    <Tooltip contentStyle={{ borderRadius: "12px", fontSize: "12px", border: "1px solid hsl(35,25%,88%)" }} />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="hsl(235,45%,38%)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "hsl(235,45%,38%)" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          )}
        </div>
      </main>
    </div>
  );
}
