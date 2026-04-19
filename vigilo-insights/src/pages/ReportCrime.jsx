import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { MapPin, Camera, CheckCircle, Loader2, AlertTriangle, ShieldAlert, AlertCircle, UploadCloud, CheckCircle2, Map as MapIcon } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { MapView } from "@/components/map/MapView";
import { MapMarker } from "@/components/map/MapMarker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportsAPI } from "@/lib/api";
import { CRIME_TYPES, SURAT_CENTER } from "@/lib/constants";
import { useTranslation } from "@/lib/i18n";
import { useNavigate } from "react-router-dom";
import { PlaceSearchInput, reverseGeocode } from "@/components/common/PlaceSearchInput";
import { useGlobalLocation } from "@/context/LocationContext";
/* ── Custom map pin HTML ── */
const reportMarkerHtml = `<div style="width:32px;height:32px;background:#ef4444;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center">
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
</div>`;

const MIN_DESCRIPTION_LENGTH = 30;
const crimesWithItems = new Set(["Theft", "Robbery", "Burglary", "Vandalism", "Fraud"]);
const crimesWithVehicle = new Set(["Theft", "Robbery", "Harassment", "Assault", "Drug Related"]);
const crimesWithWeapon = new Set(["Assault", "Robbery", "Burglary", "Harassment", "Drug Related"]);


// Derive time_of_day category from an HH:MM time string
function deriveTimeOfDay(timeStr) {
  if (!timeStr) return "";
  const hour = parseInt(timeStr.split(":")[0], 10);
  if (hour >= 6 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return "Night";
}

// Resolve the backend crime_type and auto severity from the selected value
function resolveTypeAndSeverity(selectedValue, weaponInvolved) {
  const match = CRIME_TYPES.find((t) => t.value === selectedValue);
  if (!match) return { backendType: "Other", severity: "Medium" };
  let severity = match.autoSeverity || "Medium";
  if (weaponInvolved) severity = "High";
  return { backendType: match.backendType, severity };
}

const getItemsLabel = (crimeType) => {
  if (crimeType === "Vandalism") return "Property damaged";
  if (crimeType === "Fraud") return "Money or account affected";
  return "Items stolen or affected";
};

const getItemsPlaceholder = (crimeType) => {
  if (crimeType === "Vandalism") return "Example: bike mirror, shop shutter, car window";
  if (crimeType === "Fraud") return "Example: UPI amount, bank name, account used";
  return "Example: phone, wallet, jewelry, bike";
};

const buildEnhancedDescription = (formData) => {
  const structuredDetails = [];

  if (formData.people_involved) structuredDetails.push(`People involved: ${formData.people_involved}`);
  if (formData.weapon_involved) structuredDetails.push("Weapon involved: Yes");
  if (formData.vehicle_info.trim()) structuredDetails.push(`Vehicle information: ${formData.vehicle_info.trim()}`);
  if (formData.items_affected.trim()) structuredDetails.push(`${getItemsLabel(formData.crime_type)}: ${formData.items_affected.trim()}`);
  if (formData.suspect_description.trim()) structuredDetails.push(`Suspect or witness notes: ${formData.suspect_description.trim()}`);

  if (!structuredDetails.length) {
    return formData.description.trim();
  }

  return `${formData.description.trim()}\n\nStructured details:\n- ${structuredDetails.join("\n- ")}`;
};

export default function ReportCrime() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { coords } = useGlobalLocation();

  const [formData, setFormData] = useState({
    crime_type: "",
    other_crime_text: "",
    area: "",
    date_occurred: "",
    time_input: "",
    description: "",
    people_involved: "",
    weapon_involved: false,
    vehicle_info: "",
    items_affected: "",
    suspect_description: "",
    latitude: null,
    longitude: null,
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const fileInputRef = useRef(null);

  const [position, setPosition] = useState(null);
  const [mapCenter, setMapCenter] = useState(SURAT_CENTER);
  const [mapZoom, setMapZoom] = useState(13);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [autoDetect, setAutoDetect] = useState(() => {
    try {
      const stored = localStorage.getItem("vigilo_auto_detect");
      return stored === null ? true : JSON.parse(stored);
    } catch {
      return true;
    }
  });

  const descriptionLength = formData.description.trim().length;
  const { backendType: resolvedBackendType, severity: autoSeverity } = resolveTypeAndSeverity(formData.crime_type, formData.weapon_involved);
  const showItemsField = crimesWithItems.has(resolvedBackendType);
  const showVehicleField = crimesWithVehicle.has(resolvedBackendType);
  const showWeaponField = crimesWithWeapon.has(resolvedBackendType);
  const isOtherType = formData.crime_type === "other";
  const structuredDetailsCount = [
    formData.people_involved,
    formData.vehicle_info.trim(),
    formData.items_affected.trim(),
    formData.suspect_description.trim(),
    formData.weapon_involved ? "weapon" : "",
  ].filter(Boolean).length;
  const needsExtraContext = autoSeverity === "Medium" || autoSeverity === "High";
  const reportStrength = Math.min(
    100,
    (formData.crime_type ? 12 : 0) +
      (formData.area.trim() ? 10 : 0) +
      (formData.date_occurred ? 10 : 0) +
      (formData.time_input ? 8 : 0) +
      (position ? 15 : 0) +
      Math.min(25, Math.floor(descriptionLength / 2)) +
      Math.min(15, structuredDetailsCount * 5) +
      (imageFile ? 5 : 0)
  );
  const reportStrengthLabel =
    reportStrength >= 80 ? "Strong report" : reportStrength >= 55 ? "Good start" : "Needs more detail";
  const reportStrengthTone =
    reportStrength >= 80 ? "text-green-500" : reportStrength >= 55 ? "text-yellow-500" : "text-orange-500";
  const reportHints = [
    !formData.crime_type && "Choose the closest crime type.",
    descriptionLength < MIN_DESCRIPTION_LENGTH &&
      `Write at least ${MIN_DESCRIPTION_LENGTH} characters so reviewers understand what happened.`,
    !position && "Pin the exact incident location on the map.",
    needsExtraContext &&
      structuredDetailsCount === 0 &&
      "For medium or high severity, add at least one extra detail like people involved, vehicle info, or suspect notes.",
    !imageFile && needsExtraContext && "A photo is optional, but it can speed up review for more serious reports.",
  ].filter(Boolean).slice(0, 3);

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
    if (!autoDetect || position || !coords?.lat || !coords?.lng) return;
    setMapCenter([coords.lat, coords.lng]);
    setMapZoom(14);
  }, [autoDetect, coords?.lat, coords?.lng, position]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  };

  const handleMapPick = async (lat, lng) => {
    setPosition([lat, lng]);
    setMapCenter([lat, lng]);
    try {
      const name = await reverseGeocode(lat, lng);
      if (name) setFormData((prev) => ({ ...prev, area: name }));
    } catch (err) {
      console.error("Back-fill area error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!formData.crime_type) { setError(t("Please select a crime type")); return; }
    if (isOtherType && !formData.other_crime_text.trim()) { setError(t("Please describe the type of incident")); return; }
    if (descriptionLength < MIN_DESCRIPTION_LENGTH) {
      setError(t(`Please provide at least ${MIN_DESCRIPTION_LENGTH} characters in the description`));
      return;
    }
    if (!position) { setError(t("Please pin the location on the map")); return; }
    if (!formData.date_occurred) { setError(t("Please provide the date")); return; }
    if (!formData.time_input) { setError(t("Please provide the approximate time")); return; }
    if (!formData.area.trim()) { setError(t("Please provide an area name")); return; }
    if (needsExtraContext && structuredDetailsCount === 0) {
      setError(t("Please add at least one extra detail for medium or high severity reports"));
      return;
    }

    setIsLoading(true);

    try {
      const dataToSend = new FormData();
      // Send the backend-compatible crime type and auto-calculated severity
      const crimeTypeToSend = isOtherType ? formData.other_crime_text.trim() : resolvedBackendType;
      dataToSend.append("crime_type", crimeTypeToSend);
      dataToSend.append("severity", autoSeverity);
      dataToSend.append("description", buildEnhancedDescription(formData));
      dataToSend.append("latitude", position[0]);
      dataToSend.append("longitude", position[1]);
      // Combine date + time into a full datetime
      const fullDateTime = formData.time_input ? `${formData.date_occurred}T${formData.time_input}:00` : formData.date_occurred;
      dataToSend.append("date_occurred", fullDateTime);
      dataToSend.append("time_of_day", deriveTimeOfDay(formData.time_input));
      dataToSend.append("area_name", formData.area);

      if (imageFile) {
        dataToSend.append("files", imageFile);
      }

      const data = await reportsAPI.create(dataToSend);
      setResult(data);
      setSubmitted(true);
    } catch (err) {
      if (err.status === 403) {
        setError(t("Admins cannot submit reports. Please use a regular user account."));
      } else {
        setError(err.message || t("Failed to submit report"));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      crime_type: "",
      other_crime_text: "",
      area: "",
      date_occurred: "",
      time_input: "",
      description: "",
      people_involved: "",
      weapon_involved: false,
      vehicle_info: "",
      items_affected: "",
      suspect_description: "",
      latitude: null,
      longitude: null,
    });
    setImageFile(null);
    setImagePreview(null);
    setPosition(null);
    setMapCenter(autoDetect && coords?.lat && coords?.lng ? [coords.lat, coords.lng] : SURAT_CENTER);
    setResult(null);
    setSubmitted(false);
    setError("");
  };

  if (submitted && result) {
    return (
      <div className="flex min-h-screen bg-background">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          <Navbar title={t("Report Submitted")} subtitle={t("Your report has been received")} />
          <div className="px-6 lg:px-10 pb-16 flex items-center justify-center" style={{ minHeight: "60vh" }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center max-w-md w-full"
            >
              <div className="w-20 h-20 rounded-full bg-green-500/15 text-green-500 flex items-center justify-center mx-auto mb-6">
                <CheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{t("Report Submitted Successfully!")}</h2>
              <p className="text-muted-foreground mb-6">
                {t("Your report has been submitted and is being processed by our AI verification system.")}
              </p>
              <div className="bg-card rounded-2xl p-5 shadow-soft border-ceramic space-y-3 text-left mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("Report ID")}</span>
                  <span className="text-sm font-bold font-mono text-foreground">{result.report_id || result.id}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("Trust Score")}</span>
                  <span className={`text-sm font-bold px-2 py-0.5 rounded-full ${
                    (result.trust_score || 0) >= 70 ? "bg-green-500/10 text-green-500" :
                    (result.trust_score || 0) >= 40 ? "bg-yellow-500/10 text-yellow-500" : "bg-red-500/10 text-red-500"
                  }`}>{result.trust_score || "N/A"}/100</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">{t("Status")}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-500 uppercase tracking-wider">{result.status || t("Pending")}</span>
                </div>
              </div>
              <Button onClick={resetForm} variant="outline" className="rounded-xl w-full">
                {t("Submit Another Report")}
              </Button>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto relative pb-20 lg:pb-0 w-full">
        <Navbar title={t("Report a Crime")} subtitle={t("Help keep your community safe")} />

        <div className="px-6 lg:px-10 pb-16 pt-6 max-w-[1600px] mx-auto">
          
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-10">
            {/* Form Section - Left */}
            <div className="xl:col-span-6 2xl:col-span-7 flex flex-col gap-6">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-[28px] p-6 lg:p-8 shadow-soft border-ceramic"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-[18px] bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner drop-shadow-sm">
                    <ShieldAlert size={22} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-display font-bold text-foreground tracking-tight">{t("Incident Details")}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{t("Please provide as much information as possible.")}</p>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 p-4 rounded-2xl bg-destructive/10 text-destructive text-sm flex gap-3 border border-destructive/20 items-start shadow-sm">
                    <AlertCircle size={18} className="shrink-0 mt-0.5" />
                    {t(error)}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Row 1: Type and Area */}
                  {/* Row 1: Crime Type and Address */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("What happened?")} *</Label>
                      <Select
                        required
                        value={formData.crime_type}
                        onValueChange={(v) => {
                          const match = CRIME_TYPES.find((t) => t.value === v);
                          const bt = match?.backendType || "Other";
                          setFormData((prev) => ({
                            ...prev,
                            crime_type: v,
                            other_crime_text: v === "other" ? prev.other_crime_text : "",
                            items_affected: crimesWithItems.has(bt) ? prev.items_affected : "",
                            vehicle_info: crimesWithVehicle.has(bt) ? prev.vehicle_info : "",
                            weapon_involved: crimesWithWeapon.has(bt) ? prev.weapon_involved : false,
                          }));
                        }}
                      >
                        <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-primary/20 shadow-sm transition-shadow">
                          <SelectValue placeholder={t("Select what happened")} />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl border-border shadow-xl max-h-[320px]">
                          {CRIME_TYPES.map(type => (
                            <SelectItem key={type.value} value={type.value} className="rounded-lg my-0.5">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-medium">{t(type.label)}</span>
                                <span className="text-[11px] text-muted-foreground leading-tight">{t(type.hint)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Address / Area")} *</Label>
                      <div className="relative">
                        <MapPin size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          required
                          placeholder={t("Street, area, landmark")}
                          className="h-12 pl-10 rounded-xl border-border bg-background focus-visible:ring-primary/20 shadow-sm transition-shadow"
                          value={formData.area}
                          onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Other crime type text input */}
                  {isOtherType && (
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Describe the incident type")} *</Label>
                      <Input
                        required
                        placeholder={t("e.g. Illegal parking, noise complaint, missing person...")}
                        className="h-12 rounded-xl border-border bg-background focus-visible:ring-primary/20 shadow-sm transition-shadow"
                        value={formData.other_crime_text}
                        onChange={(e) => setFormData({ ...formData, other_crime_text: e.target.value })}
                      />
                    </div>
                  )}

                  {/* Row 2: Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Date Occurred")} *</Label>
                      <Input
                        type="date"
                        required
                        className="h-12 rounded-xl border-border bg-background focus-visible:ring-primary/20 shadow-sm transition-shadow"
                        value={formData.date_occurred}
                        onChange={(e) => setFormData({ ...formData, date_occurred: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Approximate Time")} *</Label>
                      <Input
                        type="time"
                        required
                        className="h-12 rounded-xl border-border bg-background focus-visible:ring-primary/20 shadow-sm transition-shadow"
                        value={formData.time_input}
                        onChange={(e) => setFormData({ ...formData, time_input: e.target.value })}
                      />
                      {formData.time_input && (
                        <p className="text-xs text-muted-foreground ml-1">
                          {deriveTimeOfDay(formData.time_input)} hours
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="space-y-3 mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-center justify-between gap-3">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Description")} *</Label>
                      <span className={`text-xs font-medium ${descriptionLength >= MIN_DESCRIPTION_LENGTH ? "text-green-500" : "text-muted-foreground"}`}>
                        {descriptionLength}/{MIN_DESCRIPTION_LENGTH}+ {t("characters")}
                      </span>
                    </div>
                    <Textarea
                      required
                      placeholder={t("Explain what happened, what you saw, and any useful sequence of events.")}
                      className="min-h-[140px] rounded-2xl border-border bg-background resize-none focus-visible:ring-primary/20 p-4 shadow-sm transition-shadow"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground leading-relaxed px-1">
                      {t("Tip: include what happened first, who was involved, and what made the incident suspicious or harmful.")}
                    </p>
                  </div>

                  {/* Helpful Details */}
                  <div className="space-y-5 mt-4 pt-4 border-t border-border/50">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 rounded-[16px] bg-primary/10 flex items-center justify-center text-primary border border-primary/20 shadow-inner shrink-0">
                        <AlertTriangle size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-semibold text-foreground">{t("Helpful Details")}</h3>
                        <p className="text-sm text-muted-foreground">
                          {t("These details improve report quality and help your AI review score understand the incident better.")}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("People Involved")}</Label>
                        <Select value={formData.people_involved} onValueChange={(v) => setFormData({ ...formData, people_involved: v })}>
                          <SelectTrigger className="h-12 rounded-xl border-border bg-background focus:ring-primary/20 shadow-sm transition-shadow">
                            <SelectValue placeholder={t("Select estimate")} />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl border-border shadow-xl">
                            <SelectItem value="1 person">{t("1 person")}</SelectItem>
                            <SelectItem value="2-3 people">{t("2-3 people")}</SelectItem>
                            <SelectItem value="4+ people">{t("4+ people")}</SelectItem>
                            <SelectItem value="Unknown">{t("Unknown")}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {showVehicleField && (
                        <div className="space-y-2">
                          <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Vehicle Information")}</Label>
                          <Input
                            placeholder={t("Example: black Activa, white Swift, partial plate")}
                            className="h-12 rounded-xl border-border bg-background focus-visible:ring-primary/20 shadow-sm transition-shadow"
                            value={formData.vehicle_info}
                            onChange={(e) => setFormData({ ...formData, vehicle_info: e.target.value })}
                          />
                        </div>
                      )}

                      {showItemsField && (
                        <div className="space-y-2 md:col-span-2">
                          <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t(getItemsLabel(formData.crime_type))}</Label>
                          <Input
                            placeholder={t(getItemsPlaceholder(formData.crime_type))}
                            className="h-12 rounded-xl border-border bg-background focus-visible:ring-primary/20 shadow-sm transition-shadow"
                            value={formData.items_affected}
                            onChange={(e) => setFormData({ ...formData, items_affected: e.target.value })}
                          />
                        </div>
                      )}
                    </div>

                    {showWeaponField && (
                      <div className="flex items-start gap-3 rounded-2xl border border-border bg-background/60 p-4">
                        <Checkbox
                          id="weapon-involved"
                          checked={formData.weapon_involved}
                          onCheckedChange={(checked) => setFormData({ ...formData, weapon_involved: Boolean(checked) })}
                          className="mt-0.5"
                        />
                        <div className="space-y-1">
                          <Label htmlFor="weapon-involved" className="text-sm font-medium text-foreground">
                            {t("Was any weapon involved?")}
                          </Label>
                          <p className="text-xs text-muted-foreground">
                            {t("Only check this if you clearly saw or strongly suspect a weapon was involved.")}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider">{t("Suspect / Witness Notes")}</Label>
                      <Textarea
                        placeholder={t("Clothing, direction of escape, visible identifiers, or what nearby witnesses said")}
                        className="min-h-[96px] rounded-2xl border-border bg-background resize-none focus-visible:ring-primary/20 p-4 shadow-sm transition-shadow"
                        value={formData.suspect_description}
                        onChange={(e) => setFormData({ ...formData, suspect_description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Completeness */}
                  <div className="rounded-[24px] border border-primary/15 bg-primary/5 p-5 shadow-inner">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{t("Report Strength")}</p>
                        <p className="text-xs text-muted-foreground">{t("A quick guide to help you submit a useful report.")}</p>
                      </div>
                      <div className={`text-sm font-semibold ${reportStrengthTone}`}>{t(reportStrengthLabel)}</div>
                    </div>
                    <Progress value={reportStrength} className="h-2.5 bg-background/80" />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="text-xs text-muted-foreground">{reportStrength}/100</span>
                      {needsExtraContext && structuredDetailsCount === 0 ? (
                        <span className="text-xs text-yellow-500 font-medium">{t("Add one extra detail for this severity level")}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">{t("Pinned location and clearer details improve trust.")}</span>
                      )}
                    </div>
                    {reportHints.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {reportHints.map((hint) => (
                          <div key={hint} className="flex gap-2 text-xs text-muted-foreground">
                            <AlertCircle size={14} className="mt-0.5 shrink-0 text-primary" />
                            <span>{t(hint)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Add Photo */}
                  <div className="space-y-2 mt-4">
                    <Label className="text-muted-foreground font-medium ml-1 text-xs uppercase tracking-wider flex items-center gap-1.5 pt-4 border-t border-border/50">
                      <Camera size={14} /> {t("Add Photo (Optional)")}
                    </Label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-[20px] p-6 transition-all cursor-pointer text-center relative overflow-hidden flex flex-col items-center justify-center ${
                        imagePreview ? "border-primary bg-primary/5 shadow-inner" : "border-border hover:border-primary/50 hover:bg-muted/30 shadow-sm"
                      }`}
                      style={{ minHeight: "140px" }}
                    >
                      {imagePreview ? (
                        <>
                          <img src={imagePreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover opacity-40 blur-[2px]" />
                          <div className="relative z-10 w-12 h-12 bg-background border border-primary/20 rounded-full flex items-center justify-center mb-3 shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                            <CheckCircle2 size={24} className="text-primary" />
                          </div>
                          <span className="relative z-10 font-bold text-primary px-3 py-1 bg-background/80 backdrop-blur-md rounded-lg shadow-sm">{t("Image Selected")}</span>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-card rounded-full flex items-center justify-center mb-3 text-muted-foreground/60 border border-border shadow-sm group-hover:bg-primary/5 transition-colors">
                            <UploadCloud size={24} className="group-hover:text-primary transition-colors" />
                          </div>
                          <p className="font-bold text-foreground mb-1">{t("Upload Evidence")}</p>
                          <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
                            {needsExtraContext
                              ? t("Photo evidence is optional, but strongly recommended for medium or high severity incidents.")
                              : t("Drag and drop an image or click to browse files")}
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isLoading}
                    className="w-full h-[60px] rounded-2xl text-[17px] font-bold shadow-[0_8px_30px_rgba(var(--primary),0.2)] transition-all hover:scale-[1.01] hover:shadow-[0_8px_40px_rgba(var(--primary),0.3)] active:scale-[0.98] bg-primary text-primary-foreground mt-4"
                  >
                    {isLoading ? <Loader2 className="animate-spin mr-2" /> : <ShieldAlert className="mr-2" size={22} />}
                    {isLoading ? t("Submitting...") : t("Submit Report")}
                  </Button>
                </form>
              </motion.div>
            </div>

            {/* Map Section - Right */}
            <div className="xl:col-span-6 2xl:col-span-5 flex flex-col h-full min-h-[500px]">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-card rounded-[28px] p-2 shadow-soft border-ceramic relative overflow-hidden flex-1 flex flex-col h-full sticky top-28"
              >
                {/* Header overlay */}
                <div className="absolute top-6 left-6 right-6 z-[1000] flex flex-col gap-3 pointer-events-none">
                  <div className="flex justify-between items-start w-full">
                    <div className="bg-background/80 backdrop-blur-xl border border-border/50 shadow-lg p-4 rounded-2xl max-w-[280px] pointer-events-auto">
                      <h3 className="text-[17px] font-display font-bold text-foreground flex items-center gap-2 mb-1.5">
                        <MapPin size={18} className="text-primary" />
                        {t("Pin Location")} *
                      </h3>
                      <p className="text-[13px] leading-relaxed text-muted-foreground">
                        {t("Search for a place or click directly on the map to pin the incident location.")}
                      </p>
                    </div>
                    
                    {position && (
                      <div className="bg-green-500/10 backdrop-blur-xl border border-green-500/20 shadow-lg px-4 py-2.5 rounded-xl flex items-center gap-2 pointer-events-auto">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <span className="text-xs font-bold text-green-500 tracking-wide uppercase">{t("Location Set")}</span>
                      </div>
                    )}
                  </div>

                  {/* Search on Map */}
                  <div className="pointer-events-auto max-w-sm">
                    <PlaceSearchInput
                      placeholder={t("Search city, street or landmark...")}
                      onSelect={(lat, lng, shortName, fullName) => {
                        if (lat !== null) {
                          setPosition([lat, lng]);
                          setMapCenter([lat, lng]);
                          setMapZoom(16); // Zoom in on the newly selected address
                          const address = fullName || shortName;
                          if (address) setFormData((prev) => ({ ...prev, area: address }));
                        } else {
                          setPosition(null);
                        }
                      }}
                      className="shadow-xl"
                    />
                  </div>
                </div>

                {/* Map Area */}
                <div className="w-full h-full rounded-[20px] overflow-hidden relative shadow-inner flex-1 min-h-[600px]">
                   <MapView center={mapCenter} zoom={mapZoom} onMapClick={handleMapPick}>
                      {position && (
                        <MapMarker position={position} html={reportMarkerHtml} />
                      )}
                   </MapView>
                </div>
                
                {/* Warning note bottom */}
                <div className="absolute bottom-6 inset-x-6 z-[1000] pointer-events-none flex justify-center">
                  <div className="bg-background/90 backdrop-blur-xl border border-border shadow-lg py-3 px-5 rounded-2xl flex items-center gap-3">
                    <AlertTriangle size={16} className="text-yellow-500 shrink-0" />
                    <p className="text-xs font-medium text-foreground">
                      {t("False reporting is penalised under community guidelines.")}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>

          </div>
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
