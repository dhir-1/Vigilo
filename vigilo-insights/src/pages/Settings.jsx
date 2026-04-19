import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Moon, Sun, Globe, Map, Bell, Shield, Lock, Download, Trash2, Eye, Layers, LocateFixed, Loader2 } from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { authAPI } from "@/lib/api";

function useStoredState(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const item = localStorage.getItem(key);
      return item !== null ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent("settings-changed"));
  }, [key, value]);

  return [value, setValue];
}

function StatusMessage({ error, success }) {
  if (!error && !success) return null;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        error
          ? "border-destructive/20 bg-destructive/10 text-destructive"
          : "border-green-500/20 bg-green-500/10 text-green-600"
      }`}
    >
      {error || success}
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { changePassword, deleteAccount } = useAuth();
  const { t } = useTranslation();

  const [darkMode, setDarkMode] = useStoredState("vigilo_dark_mode", false);
  const [language, setLanguage] = useStoredState("vigilo_language", "en");
  const [heatmapOpacity, setHeatmapOpacity] = useStoredState("vigilo_heatmap", [70]);
  const [defaultZoom, setDefaultZoom] = useStoredState("vigilo_zoom", [13]);
  const [autoDetect, setAutoDetect] = useStoredState("vigilo_auto_detect", true);

  const [notifAlerts, setNotifAlerts] = useStoredState("vigilo_notif_alerts", true);
  const [notifReports, setNotifReports] = useStoredState("vigilo_notif_reports", true);
  const [notifSOS, setNotifSOS] = useStoredState("vigilo_notif_sos", true);
  const [notifEmail, setNotifEmail] = useStoredState("vigilo_notif_email", false);
  const [privacyLocation, setPrivacyLocation] = useStoredState("vigilo_privacy_loc", true);
  const [privacyProfile, setPrivacyProfile] = useStoredState("vigilo_privacy_prof", false);

  const [isExporting, setIsExporting] = useState(false);
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");

  useEffect(() => {
    authAPI
      .me()
      .then((user) => {
        if (!user) return;
        if (user.notif_alerts !== undefined) setNotifAlerts(user.notif_alerts);
        if (user.notif_reports !== undefined) setNotifReports(user.notif_reports);
        if (user.notif_sos !== undefined) setNotifSOS(user.notif_sos);
        if (user.notif_email !== undefined) setNotifEmail(user.notif_email);
        if (user.privacy_location !== undefined) setPrivacyLocation(user.privacy_location);
        if (user.privacy_profile !== undefined) setPrivacyProfile(user.privacy_profile);
      })
      .catch((err) => console.error("Could not sync settings remotely:", err));
  }, [setNotifAlerts, setNotifEmail, setNotifReports, setNotifSOS, setPrivacyLocation, setPrivacyProfile]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
  }, [darkMode]);

  const handlePreferenceChange = async (key, value, setter) => {
    setter(value);
    try {
      await authAPI.updateProfile({ [key]: value });
    } catch (err) {
      console.error(`Failed to update ${key}:`, err);
    }
  };

  const handleExport = async () => {
    setAccountError("");
    setAccountSuccess("");
    setIsExporting(true);
    try {
      await authAPI.exportData();
    } catch (err) {
      console.error("Failed to export data:", err);
      setAccountError(err.message || "Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    setPasswordSuccess("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Fill in all password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const response = await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordSuccess(response?.message || "Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setAccountError("");
    setAccountSuccess("");

    if (!deletePassword) {
      setAccountError("Enter your current password to delete your account.");
      return;
    }

    if (deleteConfirmText !== "DELETE") {
      setAccountError('Type "DELETE" to confirm account deletion.');
      return;
    }

    if (!window.confirm("Delete your account and remove your personal data? This cannot be undone.")) {
      return;
    }

    setIsDeletingAccount(true);
    try {
      const response = await deleteAccount({ current_password: deletePassword });
      setAccountSuccess(response?.message || "Account deleted successfully.");
      navigate("/", { replace: true });
    } catch (err) {
      setAccountError(err.message || "Failed to delete account.");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const toggleDarkMode = (val) => {
    setDarkMode(val);
    document.documentElement.classList.toggle("dark", val);
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title="Settings" subtitle="Configure your preferences" />

        <div className="px-6 lg:px-10 pb-16 grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-none">
          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-5"
            >
              <h3 className="text-lg font-display font-semibold text-foreground">{t("Appearance")}</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {darkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-warning" />}
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("Dark Mode")}</p>
                    <p className="text-xs text-muted-foreground">{t("Switch between light and dark themes")}</p>
                  </div>
                </div>
                <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Globe size={20} className="text-primary" />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t("Language")}</p>
                    <p className="text-xs text-muted-foreground">{t("Select your preferred language")}</p>
                  </div>
                </div>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="w-40 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="gu">Gujarati</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-5"
            >
              <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Map size={20} className="text-primary" />
                {t("Map Preferences")}
              </h3>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Layers size={14} /> {t("Heatmap Opacity")}
                    </Label>
                    <span className="text-sm font-bold tabular-nums text-primary">{heatmapOpacity[0]}%</span>
                  </div>
                  <Slider value={heatmapOpacity} onValueChange={setHeatmapOpacity} max={100} step={5} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label className="flex items-center gap-2">
                      <Eye size={14} /> {t("Default Zoom Level")}
                    </Label>
                    <span className="text-sm font-bold tabular-nums text-primary">{defaultZoom[0]}</span>
                  </div>
                  <Slider value={defaultZoom} onValueChange={setDefaultZoom} min={8} max={18} step={1} />
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <LocateFixed size={20} className="text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{t("Auto-detect Location")}</p>
                      <p className="text-xs text-muted-foreground">{t("Center map on your current location")}</p>
                    </div>
                  </div>
                  <Switch checked={autoDetect} onCheckedChange={setAutoDetect} />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Bell size={20} className="text-primary" />
                {t("Notification Preferences")}
              </h3>
              {[
                { label: "Safety Alerts", desc: "Get notified about safety changes in saved zones", state: notifAlerts, set: setNotifAlerts, key: "notif_alerts" },
                { label: "Report Updates", desc: "Receive updates on your submitted reports", state: notifReports, set: setNotifReports, key: "notif_reports" },
                { label: "SOS Notifications", desc: "Get notified of SOS alerts in your area", state: notifSOS, set: setNotifSOS, key: "notif_sos" },
                { label: "Email Notifications", desc: "Receive notifications via email", state: notifEmail, set: setNotifEmail, key: "notif_email" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">{t(item.label)}</p>
                    <p className="text-xs text-muted-foreground">{t(item.desc)}</p>
                  </div>
                  <Switch checked={item.state} onCheckedChange={(val) => handlePreferenceChange(item.key, val, item.set)} />
                </div>
              ))}
            </motion.div>
          </div>

          <div className="space-y-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Shield size={20} className="text-primary" />
                {t("Privacy Settings")}
              </h3>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("Share Location")}</p>
                  <p className="text-xs text-muted-foreground">{t("Allow Vigilo to use your location for safety features")}</p>
                </div>
                <Switch checked={!privacyLocation} onCheckedChange={(val) => handlePreferenceChange("privacy_location", !val, setPrivacyLocation)} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-foreground">{t("Public Profile")}</p>
                  <p className="text-xs text-muted-foreground">{t("Make your profile visible to other users")}</p>
                </div>
                <Switch checked={!privacyProfile} onCheckedChange={(val) => handlePreferenceChange("privacy_profile", !val, setPrivacyProfile)} />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
                <Lock size={20} className="text-primary" />
                {t("Change Password")}
              </h3>
              <StatusMessage error={passwordError} success={passwordSuccess} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>{t("Current Password")}</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    className="rounded-xl"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("New Password")}</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    className="rounded-xl"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("Confirm Password")}</Label>
                  <Input
                    type="password"
                    placeholder="********"
                    className="rounded-xl"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {t("Use at least 8 characters and include a number.")}
              </p>
              <Button className="rounded-xl gap-2" onClick={handleChangePassword} disabled={isUpdatingPassword}>
                {isUpdatingPassword && <Loader2 size={16} className="animate-spin" />}
                {t("Update Password")}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-card rounded-2xl p-6 shadow-soft border-ceramic space-y-4"
            >
              <h3 className="text-lg font-display font-semibold text-foreground">{t("Data & Account")}</h3>
              <StatusMessage error={accountError} success={accountSuccess} />
              <div className="flex flex-wrap gap-3">
                <Button variant="outline" className="rounded-xl gap-2" onClick={handleExport} disabled={isExporting}>
                  {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {t("Export My Data")}
                </Button>
              </div>
              <Separator />
              <div className="space-y-4">
                <p className="text-sm font-medium text-foreground">{t("Delete Account")}</p>
                <p className="text-xs text-muted-foreground">
                  {t("Your profile will be deactivated and your personal details will be removed from the app.")}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t("Current Password")}</Label>
                    <Input
                      type="password"
                      placeholder="********"
                      className="rounded-xl"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('Type "DELETE" to confirm')}</Label>
                    <Input
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="rounded-xl"
                      placeholder="DELETE"
                    />
                  </div>
                </div>
                <Button variant="destructive" className="rounded-xl gap-2" onClick={handleDeleteAccount} disabled={isDeletingAccount}>
                  {isDeletingAccount ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                  {t("Delete Account")}
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
