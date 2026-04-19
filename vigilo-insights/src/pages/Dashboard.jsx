import { useState, useMemo, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Layers, Filter, Clock, Loader2, Play, Pause } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { MapView } from "@/components/map/MapView";
import { CrimeMarker } from "@/components/map/CrimeMarker";
import { HeatmapLayer } from "@/components/map/HeatmapLayer";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { crimesAPI, safetyAPI } from "@/lib/api";
import { CRIME_TYPES, SEVERITY_LEVELS, TIME_OF_DAY, SURAT_CENTER } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { useGlobalLocation } from "@/context/LocationContext";

export default function Dashboard() {
  const { t } = useTranslation();
  const { coords } = useGlobalLocation();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const searchQuery = searchParams.get("search");

  const [showHeatmap, setShowHeatmap] = useState(() => {
    try {
      const stored = localStorage.getItem("vigilo_heatmap_active");
      return stored ? JSON.parse(stored) : false;
    } catch {
      return false;
    }
  });

  const [defaultZoom] = useState(() => {
    try {
      const stored = localStorage.getItem("vigilo_zoom");
      return stored ? JSON.parse(stored)[0] : 13;
    } catch {
      return 13;
    }
  });

  const [crimeTypeFilter, setCrimeTypeFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [daysAgo, setDaysAgo] = useState("30");
  const [hourSlider, setHourSlider] = useState(() => {
    try {
      const stored = localStorage.getItem("vigilo_hour_slider");
      return stored ? JSON.parse(stored) : [12];
    } catch {
      return [12];
    }
  });

  const [showFilters, setShowFilters] = useState(false);
  const [autoDetect, setAutoDetect] = useState(() => {
    try {
      const stored = localStorage.getItem("vigilo_auto_detect");
      return stored === null ? true : JSON.parse(stored);
    } catch {
      return true;
    }
  });

  const [isAnimating, setIsAnimating] = useState(false);
  const [crimes, setCrimes] = useState([]);
  const [isLoadingCrimes, setIsLoadingCrimes] = useState(true);
  const [crimesError, setCrimesError] = useState(null);
  const [hourlyRisk, setHourlyRisk] = useState([]);
  const [safetyScore, setSafetyScore] = useState(null);

  useEffect(() => {
    localStorage.setItem("vigilo_heatmap_active", JSON.stringify(showHeatmap));
    localStorage.setItem("vigilo_hour_slider", JSON.stringify(hourSlider));
  }, [showHeatmap, hourSlider]);

  useEffect(() => {
    const syncPreferences = () => {
      try {
        const stored = localStorage.getItem("vigilo_auto_detect");
        setAutoDetect(stored === null ? true : JSON.parse(stored));
      } catch {
        setAutoDetect(true);
      }
    };

    window.addEventListener("settings-changed", syncPreferences);
    return () => window.removeEventListener("settings-changed", syncPreferences);
  }, []);

  useEffect(() => {
    let animationInterval;

    if (isAnimating) {
      animationInterval = setInterval(() => {
        setHourSlider((prev) => [(prev[0] + 1) % 24]);
      }, 1000);
    }

    return () => clearInterval(animationInterval);
  }, [isAnimating]);

  const fetchCrimes = useCallback(async () => {
    setIsLoadingCrimes(true);
    setCrimesError(null);

    try {
      const params = {};
      if (crimeTypeFilter !== "all") params.crime_type = crimeTypeFilter;
      if (severityFilter !== "all") params.severity = severityFilter;
      if (timeFilter !== "all") params.time_of_day = timeFilter;
      if (daysAgo) params.days_ago = daysAgo;
      params.limit = 200;

      let data = await crimesAPI.list(params);

      if (searchQuery && Array.isArray(data)) {
        const q = searchQuery.toLowerCase();
        data = data.filter((c) =>
          c.crime_type?.toLowerCase().includes(q) ||
          c.area_name?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q) ||
          c.report_id?.toLowerCase().includes(q) ||
          c.id?.toLowerCase().includes(q)
        );
      }

      setCrimes(Array.isArray(data) ? data : []);
    } catch (err) {
      setCrimesError(err.message || "Failed to load crimes");
      setCrimes([]);
    } finally {
      setIsLoadingCrimes(false);
    }
  }, [crimeTypeFilter, severityFilter, timeFilter, daysAgo, searchQuery]);

  useEffect(() => {
    fetchCrimes();
  }, [fetchCrimes]);

  useEffect(() => {
    safetyAPI.hourlyRisk()
      .then((data) => setHourlyRisk(Array.isArray(data) ? data : []))
      .catch(() => setHourlyRisk([]));
  }, []);

  const currentHourRisk = useMemo(() => {
    const entry = hourlyRisk.find((h) => h.hour === hourSlider[0]);
    if (!entry) return null;
    return entry.risk_level;
  }, [hourlyRisk, hourSlider]);

  const getHourRiskColor = (risk) => {
    switch (risk) {
      case "Low":
        return "text-green-500";
      case "Medium":
        return "text-yellow-500";
      case "High":
        return "text-red-500";
      default:
        return "text-primary";
    }
  };

  const markers = useMemo(() => {
    return crimes.map((c) => ({
      id: c.id,
      reportId: c.report_id,
      lat: c.latitude,
      lng: c.longitude,
      type: c.crime_type?.toLowerCase()?.replace(/\s/g, "_") || "other",
      severity: c.severity?.toLowerCase() || "medium",
      area: c.area_name || "Unknown",
      date: c.date_occurred?.split("T")[0] || "",
      time: c.time_of_day || "",
      safetyScore: c.trust_score || 50,
      description: c.description || "",
      reporter_id: c.user_id,
      reporter_name: c.reporter_name,
      communityConfirmationCount: c.community_confirmation_count || 0,
      viewerHasConfirmed: !!c.viewer_has_confirmed,
      communityTrustBoost: c.community_trust_boost || 0,
      data_source: c.data_source || "community_report",
      precision_level: c.precision_level || "exact",
    }));
  }, [crimes]);

  const stats = useMemo(() => {
    const total = crimes.length;
    const highSeverity = crimes.filter((c) => c.severity === "High").length;

    return [
      { value: total.toString(), label: "Total incidents" },
      { value: highSeverity.toString(), label: "High severity" },
      { value: crimes.filter((c) => c.severity === "Medium").length.toString(), label: "Medium severity" },
      { value: crimes.filter((c) => c.severity === "Low").length.toString(), label: "Low severity" },
    ];
  }, [crimes]);

  const handleMapClick = useCallback(async (lat, lng) => {
    try {
      const hour = hourSlider[0];
      const data = await safetyAPI.score(lat, lng, 1000, hour);
      setSafetyScore(data);
    } catch {
      setSafetyScore(null);
    }
  }, [hourSlider]);

  const handleConfirmationChange = useCallback((updatedReport) => {
    if (!updatedReport?.id) return;

    setCrimes((prev) =>
      prev.map((crime) => (crime.id === updatedReport.id ? { ...crime, ...updatedReport } : crime))
    );
  }, []);

  const mapCenter = autoDetect && coords?.lat && coords?.lng
    ? [coords.lat, coords.lng]
    : SURAT_CENTER;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden">
        <Navbar title={t("Crime Map Dashboard")} subtitle={t("Real-time crime intelligence for Surat")} />

        <div className="px-4 sm:px-6 lg:px-10 pb-16 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {stats.map((stat) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-2xl p-4 shadow-soft border-ceramic"
              >
                <p className="text-2xl font-bold tabular-nums text-foreground">{stat.value}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{t(stat.label)}</p>
              </motion.div>
            ))}
          </div>

          {crimesError && (
            <div className="p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20">
              {crimesError}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="h-10 px-4 rounded-xl bg-card border border-border text-sm font-medium text-foreground hover:border-primary transition-all flex items-center gap-2 shadow-soft"
            >
              <Filter size={16} />
              {t("Filters")}
            </button>
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`h-10 px-4 rounded-xl text-sm font-medium transition-all flex items-center gap-2 shadow-soft ${
                showHeatmap
                  ? "bg-primary text-primary-foreground"
                  : "bg-card border border-border text-foreground hover:border-primary"
              }`}
            >
              <Layers size={16} />
              {t("Heatmap")}
            </button>
            <Badge variant="outline" className="h-8">
              {isLoadingCrimes ? (
                <span className="flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> {t("Loading...")}</span>
              ) : (
                `${markers.length} ${t("incidents shown")}`
              )}
            </Badge>
          </div>

          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-card rounded-2xl p-5 shadow-soft border-ceramic grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
            >
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Crime Type")}</label>
                <Select value={crimeTypeFilter} onValueChange={setCrimeTypeFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("All Types")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Types")}</SelectItem>
                    {[...new Set(CRIME_TYPES.map(t => t.backendType))].map((bt) => (
                      <SelectItem key={bt} value={bt}>{t(bt)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Severity")}</label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("All")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Severity")}</SelectItem>
                    {SEVERITY_LEVELS.map((s) => (
                      <SelectItem key={s.value} value={s.label}>{t(s.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Time of Day")}</label>
                <Select value={timeFilter} onValueChange={setTimeFilter}>
                  <SelectTrigger className="rounded-xl"><SelectValue placeholder={t("All")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("All Times")}</SelectItem>
                    {TIME_OF_DAY.map((time) => (
                      <SelectItem key={time.value} value={time.label.split(" ")[0]}>{t(time.label)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1.5 block">{t("Time Range")}</label>
                <Select value={daysAgo} onValueChange={setDaysAgo}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">{t("Last 7 days")}</SelectItem>
                    <SelectItem value="30">{t("Last 30 days")}</SelectItem>
                    <SelectItem value="180">{t("Last 6 months")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl overflow-hidden shadow-soft border-ceramic bg-card relative"
          >
            {isLoadingCrimes && (
              <div className="absolute inset-0 z-20 bg-background/50 flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-primary" />
              </div>
            )}

            <div className="h-[55vh] min-h-[340px] max-h-[520px] sm:min-h-[420px] md:h-[500px]">
              <MapView center={mapCenter} zoom={defaultZoom} onMapClick={handleMapClick}>
                <HeatmapLayer visible={showHeatmap} hour={hourSlider[0]} />
                {markers.map((marker) => (
                  <CrimeMarker key={marker.id} marker={marker} onConfirmationChange={handleConfirmationChange} />
                ))}
              </MapView>
            </div>

            {safetyScore && (
              <div className="absolute bottom-3 left-3 right-3 sm:bottom-4 sm:left-4 sm:right-auto z-20 bg-card/95 backdrop-blur-md rounded-2xl p-4 border-ceramic shadow-soft max-w-none sm:max-w-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-foreground">{t("Area Safety Score")}</span>
                  <button onClick={() => setSafetyScore(null)} className="text-muted-foreground hover:text-foreground text-xs">
                    Close
                  </button>
                </div>
                <div className={`text-3xl font-bold tabular-nums ${
                  safetyScore.safety_score >= 70 ? "text-green-500" :
                  safetyScore.safety_score >= 40 ? "text-yellow-500" :
                  "text-red-500"
                }`}>
                  {Math.round(safetyScore.safety_score)}/100
                </div>
                {safetyScore.time_message && (
                  <p className="text-xs text-muted-foreground mt-1">{safetyScore.time_message}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {safetyScore.crime_count} {t("crimes nearby")} | {t("Risk:")} {t(safetyScore.risk_level)}
                </p>
              </div>
            )}
          </motion.div>

          <div className="bg-card rounded-2xl p-5 shadow-soft border-ceramic">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock size={16} className="text-primary" />
                <span className="text-sm font-medium text-foreground">{t("Time-based Risk View")}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAnimating(!isAnimating)}
                  className="rounded-lg gap-2"
                >
                  {isAnimating ? <Pause size={14} /> : <Play size={14} />}
                  {isAnimating ? t("Stop") : t("Play")}
                </Button>
                <span className={`text-sm font-bold tabular-nums ${getHourRiskColor(currentHourRisk)}`}>
                  {hourSlider[0] < 10 ? `0${hourSlider[0]}` : hourSlider[0]}:00
                  {currentHourRisk ? ` - ${t(currentHourRisk)} ${t("risk")}` : ""}
                </span>
              </div>
            </div>

            <Slider
              value={hourSlider}
              onValueChange={setHourSlider}
              max={23}
              min={0}
              step={1}
              className="w-full"
            />

            <div className="flex justify-between mt-2 text-[9px] sm:text-[10px] text-muted-foreground">
              <span>12 AM</span>
              <span>6 AM</span>
              <span>12 PM</span>
              <span>6 PM</span>
              <span>11 PM</span>
            </div>

            {hourlyRisk.length > 0 && (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground font-medium">{t("Click any hour to jump the slider:")}</p>
                <div className="flex gap-[2px] h-10 items-end overflow-x-auto pb-1">
                  {hourlyRisk.map((h) => {
                    const isActive = hourSlider[0] === h.hour;
                    const barHeight = h.risk_level === "High" ? "100%" : h.risk_level === "Medium" ? "65%" : "35%";
                    const barColor = h.risk_level === "High"
                      ? "bg-red-500"
                      : h.risk_level === "Medium"
                      ? "bg-yellow-500"
                      : "bg-green-500";

                    return (
                      <div
                        key={h.hour}
                        className="flex-1 flex flex-col items-center justify-end h-full relative group cursor-pointer"
                        onClick={() => setHourSlider([h.hour])}
                      >
                        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-foreground text-background text-[10px] px-2 py-1.5 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 shadow-lg">
                          <div className="font-bold">{h.hour < 10 ? `0${h.hour}` : h.hour}:00</div>
                          <div>{h.crime_count ?? 0} crimes | {h.risk_level}</div>
                          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 rotate-45 w-2 h-2 bg-foreground" />
                        </div>

                        <div
                          className={`w-full rounded-t-sm transition-all duration-200 ${barColor} ${
                            isActive ? "opacity-100 ring-2 ring-foreground/50 ring-offset-1" : "opacity-60 hover:opacity-90"
                          }`}
                          style={{ height: barHeight }}
                        />

                        {h.hour % 3 === 0 && (
                          <span className="text-[8px] text-muted-foreground mt-1 tabular-nums">
                            {h.hour === 0 ? "12a" : h.hour <= 11 ? `${h.hour}a` : h.hour === 12 ? "12p" : `${h.hour - 12}p`}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-4 text-[10px]">
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-green-500" /> {t("Low Risk")}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-yellow-500" /> {t("Medium Risk")}</span>
                    <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> {t("High Risk")}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    {(() => {
                      const highHours = hourlyRisk.filter((h) => h.risk_level === "High");
                      const lowHours = hourlyRisk.filter((h) => h.risk_level === "Low");
                      const safestHour = lowHours.length > 0 ? lowHours[0] : null;

                      return (
                        <>
                          {safestHour && (
                            <span className="text-green-500 font-medium">
                              {t("Safest:")} {safestHour.hour < 10 ? `0${safestHour.hour}` : safestHour.hour}:00
                            </span>
                          )}
                          {highHours.length > 0 && (
                            <span className="text-red-500 font-medium">
                              {highHours.length} {t("high-risk hours")}
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
