import { useState, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Shield, MapPin, Bell, Clock, ChevronRight, Edit3, Camera, Image as ImageIcon,
  TrendingUp, Star, Award, Users, Eye, Route, Phone, Mail,
  Plus, X, Save, Loader2, AlertTriangle as AlertTriangleIcon, FileText, ExternalLink
} from "lucide-react";
import { Sidebar } from "@/components/common/Sidebar";
import { Navbar } from "@/components/common/Navbar";
import { SOSButton } from "@/components/common/SOSButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { contactsAPI, sosAPI, reportsAPI } from "@/lib/api";

const badges = [
  { icon: Shield, label: "Safety pioneer", color: "bg-primary/10 text-primary" },
  { icon: Eye, label: "Watchful neighbor", color: "bg-secondary/10 text-secondary" },
  { icon: Star, label: "Top reporter", color: "bg-gold/10 text-gold" },
  { icon: Award, label: "Community hero", color: "bg-accent/10 text-accent" },
];

export default function Profile() {
  const navigate = useNavigate();
  const { user, updateProfile, uploadImage } = useAuth();
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.full_name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const contactsSectionRef = useRef(null);
  const activitySectionRef = useRef(null);

  // Upload states
  const fileInputRef = useRef(null);
  const bannerInputRef = useRef(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  // Emergency contacts
  const [contacts, setContacts] = useState([]);
  const [contactsLoading, setContactsLoading] = useState(true);
  const [contactError, setContactError] = useState("");
  const [newContact, setNewContact] = useState({ name: "", phone: "", email: "" });
  const [showAddForm, setShowAddForm] = useState(false);
  const [addingContact, setAddingContact] = useState(false);

  // Data arrays
  const [sosHistory, setSosHistory] = useState([]);
  const [userReports, setUserReports] = useState([]);

  // Fetch data
  const fetchData = useCallback(() => {
    setContactsLoading(true);
    contactsAPI.list()
      .then((data) => setContacts(Array.isArray(data) ? data : []))
      .catch(() => setContacts([]))
      .finally(() => setContactsLoading(false));

    sosAPI.history()
      .then((data) => setSosHistory(Array.isArray(data) ? data : []))
      .catch(() => setSosHistory([]));

    reportsAPI.myReports()
      .then((data) => setUserReports(Array.isArray(data) ? data : []))
      .catch(() => setUserReports([]));
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    setSaveError("");
    try {
      await updateProfile({ full_name: name, phone });
      setEditing(false);
    } catch (err) {
      setSaveError(err.message || "Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddContact = async () => {
    if (!newContact.name || !newContact.phone) {
      setContactError("Name and phone are required");
      return;
    }
    setAddingContact(true);
    setContactError("");
    try {
      await contactsAPI.create(newContact);
      setNewContact({ name: "", phone: "", email: "" });
      setShowAddForm(false);
      fetchData();
    } catch (err) {
      setContactError(err.message || "Failed to add contact");
    } finally {
      setAddingContact(false);
    }
  };

  const handleRemoveContact = async (id) => {
    try {
      await contactsAPI.remove(id);
      fetchData();
    } catch (err) {
      setContactError(err.message || "Failed to remove contact");
    }
  };

  const handleUploadClick = (type) => {
    if (type === "photo") {
      fileInputRef.current?.click();
    } else {
      bannerInputRef.current?.click();
    }
  };

  const handleFileChange = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === "photo") setUploadingPhoto(true);
    else setUploadingBanner(true);

    const formData = new FormData();
    formData.append("type", type);
    formData.append("file", file);

    try {
      await uploadImage(formData);
    } catch (error) {
      console.error("Failed to upload image:", error);
      setSaveError("Failed to upload image. Please try again.");
    } finally {
      if (type === "photo") setUploadingPhoto(false);
      else setUploadingBanner(false);
      e.target.value = null;
    }
  };

  // Calculate Real stats and badges
  const reportsCount = userReports.length;
  const activeAlerts = sosHistory.filter((s) => s.status?.toLowerCase() !== "resolved").length;
  const totalSos = sosHistory.length;
  const contactsCount = contacts.length;
  const verifiedReportsCount = userReports.filter((r) => r.status === "verified").length;

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(now.getDate() - 30);
  const sixtyDaysAgo = new Date(now);
  sixtyDaysAgo.setDate(now.getDate() - 60);

  const getReportDate = (report) => {
    const raw = report.created_at || report.date_occurred;
    const parsed = raw ? new Date(raw) : null;
    return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
  };

  const recentReportCount = userReports.filter((report) => {
    const date = getReportDate(report);
    return date && date >= thirtyDaysAgo;
  }).length;

  const previousReportCount = userReports.filter((report) => {
    const date = getReportDate(report);
    return date && date >= sixtyDaysAgo && date < thirtyDaysAgo;
  }).length;

  const safetySummary = recentReportCount < previousReportCount
    ? "Your recent incident activity is lower than the previous 30 days."
    : recentReportCount > previousReportCount
      ? "Your recent incident activity is higher than the previous 30 days."
      : recentReportCount === 0 && activeAlerts === 0
        ? "No recent incidents or active SOS alerts on your account."
        : "Your recent incident activity is steady compared with the previous 30 days.";

  const suggestedArea = userReports.find((report) => report.area_name)?.area_name;
  const reportRecommendationText = suggestedArea
    ? `Report suspicious activity in ${suggestedArea}`
    : "Report suspicious activity in your area";

  const earnedBadges = [
    { icon: Shield, label: "Safety pioneer", color: "bg-primary/10 text-primary" }, // Everyone starts here
    ...(reportsCount >= 1 ? [{ icon: Eye, label: "Watchful neighbor", color: "bg-secondary/10 text-secondary" }] : []),
    ...(reportsCount >= 5 ? [{ icon: Star, label: "Top reporter", color: "bg-gold/10 text-gold" }] : []),
    ...(contactsCount >= 3 ? [{ icon: Award, label: "Community hero", color: "bg-accent/10 text-accent" }] : []),
    ...(totalSos > 0 ? [{ icon: Bell, label: "Survivor", color: "bg-red-500/10 text-red-500" }] : []),
    ...(reportsCount >= 10 ? [{ icon: TrendingUp, label: "City Guardian", color: "bg-emerald-500/10 text-emerald-500" }] : []),
  ];
  const displayBadges = earnedBadges.length > 0 ? earnedBadges : [];

  const safetyScore = Math.round(Math.min(100, Math.max(0,
    92
    - Math.min(45, recentReportCount * 8)
    - Math.min(30, activeAlerts * 15)
    - (recentReportCount > previousReportCount
      ? Math.min(15, (recentReportCount - previousReportCount) * 3)
      : 0)
    + Math.min(12, contactsCount * 4)
  )));

  const safetyLabel = safetyScore >= 75
    ? "Low Risk"
    : safetyScore >= 45
      ? "Moderate Risk"
      : "High Risk";
  const safetyTone = safetyScore >= 75
    ? "text-emerald-500"
    : safetyScore >= 45
      ? "text-amber-500"
      : "text-red-500";
  const safetyBadgeTone = safetyScore >= 75
    ? "bg-emerald-500/10 text-emerald-500"
    : safetyScore >= 45
      ? "bg-amber-500/10 text-amber-500"
      : "bg-red-500/10 text-red-500";
  const safetyArcLength = 126;
  const safetyArcOffset = safetyArcLength - ((safetyScore / 100) * safetyArcLength);

  const scrollToSection = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const statCards = [
    {
      label: t("Reported Crimes"),
      value: reportsCount.toString(),
      icon: FileText,
      onClick: () => navigate("/my-reports"),
    },
    {
      label: t("Active SOS Alerts"),
      value: activeAlerts.toString(),
      icon: AlertTriangleIcon,
      onClick: () => {
        setShowAllActivity(true);
        scrollToSection(activitySectionRef);
      },
    },
    {
      label: t("Verified Reports"),
      value: verifiedReportsCount.toString(),
      icon: Shield,
      onClick: () => navigate("/my-reports"),
    },
    {
      label: t("Emergency Contacts"),
      value: contactsCount.toString(),
      icon: Users,
      onClick: () => {
        scrollToSection(contactsSectionRef);
        if (contactsCount === 0) {
          setShowAddForm(true);
        }
      },
    },
  ];

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Navbar title="Profile" subtitle="Manage your account & preferences" />

        <div className="px-6 lg:px-10 pb-16 grid grid-cols-1 xl:grid-cols-12 gap-8 w-full max-w-none">
          {/* LEFT COLUMN */}
          <div className="contents">
            {/* Profile Header Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="order-1 xl:col-span-12 relative bg-card rounded-[28px] shadow-soft border-ceramic overflow-hidden"
            >
              <div 
                className="h-32 sm:h-40 relative overflow-hidden flex justify-end p-4 items-start" 
                style={
                  user?.banner_url 
                    ? { backgroundImage: `url(${user.banner_url})`, backgroundSize: "cover", backgroundPosition: "center" }
                    : { background: 'linear-gradient(135deg, hsl(235,45%,38%), hsl(235,35%,28%), hsl(42,85%,52%))' }
                }
              >
                {!user?.banner_url && <div className="absolute inset-0 opacity-20 pattern-asanoha" />}
                
                <div className="flex gap-2 relative z-10">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={bannerInputRef} 
                    onChange={(e) => handleFileChange(e, "banner")} 
                  />
                  {user?.id && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/user/${user.id}`)}
                      className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-xl text-xs border border-white/10"
                    >
                      <ExternalLink size={12} className="mr-1" />
                      {t("Public Profile")}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleUploadClick("banner")}
                    disabled={uploadingBanner}
                    className="bg-black/40 hover:bg-black/60 text-white backdrop-blur-md rounded-xl text-xs border border-white/10"
                  >
                    {uploadingBanner ? <Loader2 size={12} className="animate-spin mr-1" /> : <ImageIcon size={12} className="mr-1" />}
                    {t("Banner")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (editing) handleSaveProfile();
                      else setEditing(true);
                    }}
                    disabled={isSaving}
                    className="bg-card/80 hover:bg-card text-foreground backdrop-blur-md rounded-xl text-xs border border-white/10"
                  >
                    {isSaving ? <Loader2 size={12} className="animate-spin mr-1" /> : <Edit3 size={12} className="mr-1" />}
                    {editing ? (isSaving ? t("Saving...") : t("Save")) : t("Edit profile")}
                  </Button>
                </div>
              </div>

              <div className="px-6 lg:px-8 pb-6 bg-card relative pt-4 sm:pt-0">
                {saveError && (
                  <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">{saveError}</div>
                )}
                <div className="flex flex-col sm:flex-row sm:items-end gap-5">
                  <div className="relative group w-24 h-24 sm:w-32 sm:h-32 rounded-[32px] overflow-hidden bg-background border-4 border-card shadow-soft flex items-center justify-center flex-shrink-0 -mt-16 sm:-mt-20 z-20">
                    {user?.profile_photo_url ? (
                      <img src={user.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary text-4xl font-display font-bold">
                        {(user?.full_name || "U").charAt(0).toUpperCase()}
                      </div>
                    )}
                    
                    {/* Hover Upload Overlay */}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={(e) => handleFileChange(e, "photo")} 
                    />
                    <div 
                      className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer"
                      onClick={() => handleUploadClick("photo")}
                    >
                      {uploadingPhoto ? (
                        <Loader2 size={24} className="text-white animate-spin" />
                      ) : (
                        <>
                          <Camera size={24} className="text-white mb-1" />
                          <span className="text-white text-[10px] font-medium">Update</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 sm:pb-2">
                    {editing ? (
                      <div className="space-y-2 max-w-sm">
                        <Input value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl text-lg font-bold bg-muted/50 border-transparent focus-visible:ring-1" placeholder={t("Full Name")} />
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl text-sm bg-muted/50 border-transparent focus-visible:ring-1" placeholder={t("Phone")} />
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-[-0.02em] text-foreground">{user?.full_name || t("User")}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5 mb-1">{user?.email}</p>
                        <p className="text-xs text-muted-foreground/70">{user?.phone}</p>
                        {user?.role && (
                          <span className="inline-block px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] uppercase tracking-wider font-bold mt-2">
                            {t(user.role)}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Emergency Contacts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              ref={contactsSectionRef}
              className="order-2 xl:col-span-8 bg-card rounded-3xl p-6 shadow-soft border-ceramic"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-display font-semibold text-foreground">{t("Emergency Contacts")}</h3>
                {contacts.length < 5 && !showAddForm && (
                  <Button variant="ghost" size="sm" onClick={() => setShowAddForm(true)} className="text-primary gap-1">
                    <Plus size={14} /> {t("Add")}
                  </Button>
                )}
              </div>

              {contactError && (
                <div className="mb-3 p-2 rounded-lg bg-destructive/10 text-destructive text-xs">{contactError}</div>
              )}

              {/* Add contact form */}
              {showAddForm && (
                <div className="mb-4 p-4 rounded-2xl bg-muted/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Input
                      placeholder={t("Name *")}
                      className="rounded-xl text-sm"
                      value={newContact.name}
                      onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                    />
                    <Input
                      placeholder={t("Phone *")}
                      className="rounded-xl text-sm"
                      value={newContact.phone}
                      onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                    />
                    <Input
                      placeholder={t("Email")}
                      className="rounded-xl text-sm"
                      value={newContact.email}
                      onChange={(e) => setNewContact((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddContact} disabled={addingContact} className="rounded-xl gap-1">
                      {addingContact ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                      {t("Save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowAddForm(false); setContactError(""); }} className="rounded-xl">
                      {t("Cancel")}
                    </Button>
                  </div>
                </div>
              )}

              {/* Contacts list */}
              <div className="space-y-3">
                {contactsLoading ? (
                  <div className="text-center py-4">
                    <Loader2 size={20} className="animate-spin text-primary mx-auto" />
                  </div>
                ) : contacts.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 opacity-60">{t("No emergency contacts added yet.")}</p>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40 group hover:bg-muted/60 transition-colors">
                      <div className="p-2.5 rounded-xl bg-destructive/10 text-destructive">
                        <Phone size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {contact.name}
                          {contact.is_primary && <span className="ml-2 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">{t("Primary")}</span>}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{contact.phone} {contact.email && `• ${contact.email}`}</p>
                      </div>
                      <button onClick={() => handleRemoveContact(contact.id)} className="text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 p-2">
                        <X size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            <div className="contents">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="order-4 xl:col-span-8 bg-card rounded-3xl p-6 shadow-soft border-ceramic"
            >
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">{t("Badges earned")}</h3>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {displayBadges.map((b, i) => (
                  <div key={i} className={`flex items-center gap-3 p-3.5 rounded-2xl ${b.color.split(" ")[0]} transition-transform hover:scale-105 duration-300`}>
                    <div className={`p-2 rounded-xl ${b.color}`}>
                      <b.icon size={16} />
                    </div>
                    <span className="text-[13px] font-medium text-foreground">{t(b.label)}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Account Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="order-6 xl:col-span-6 bg-card rounded-3xl p-6 shadow-soft border-ceramic h-full"
            >
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">{t("Account Information")}</h3>
              <div className="space-y-2">
                {[
                  { label: "Email", value: user?.email || "—" },
                  { label: "Role", value: user?.role || "user" },
                  { label: "Member Since", value: user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "—" },
                ].map((stat) => (
                  <div key={stat.label} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl bg-muted/30">
                    <span className="text-[13px] text-muted-foreground mb-1 sm:mb-0">{t(stat.label)}</span>
                    <span className="text-sm font-medium text-foreground capitalize">{t(stat.value)}</span>
                  </div>
                ))}
              </div>
            </motion.div>
            </div>

          </div>

          {/* RIGHT COLUMN (STATS) */}
          <div className="contents">
            
            {/* Safety Score Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="order-3 xl:col-span-4 bg-card rounded-[28px] p-8 shadow-soft border-ceramic flex flex-col items-center justify-center text-center relative overflow-hidden"
            >
              {/* Subtle background glow */}
              <div className="absolute -top-24 mt-4 w-48 h-48 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
              
              <h3 className="text-md font-medium text-muted-foreground mb-6">{t("Safety score")}</h3>
              
              {/* Half-circle gauge representation */}
              <div className="relative w-48 h-24 mb-2">
                {/* Background arc */}
                <svg className="absolute w-full h-full" viewBox="0 0 100 50">
                  <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/30" strokeLinecap="round" />
                  {/* Foreground arc (percentage) */}
                  <path
                    d="M 10 50 A 40 40 0 0 1 90 50"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="8"
                    className={safetyTone}
                    strokeLinecap="round"
                    strokeDasharray={safetyArcLength}
                    strokeDashoffset={safetyArcOffset}
                  />
                </svg>
                
                <div className="absolute bottom-0 inset-x-0 flex flex-col items-center justify-end h-full font-display">
                  <div className="flex items-baseline">
                   <span className="text-5xl font-bold tracking-tighter text-foreground">{safetyScore}</span>
                    <span className="text-xl text-muted-foreground font-medium">/100</span>
                  </div>
                </div>
              </div>
              
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-6 ${safetyBadgeTone}`}>
                {t(safetyLabel)}
              </div>
              
              <p className="text-sm text-muted-foreground leading-relaxed px-4">
                {t(safetySummary)}
              </p>
            </motion.div>

            {/* Stats Grid */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="order-5 xl:col-span-4 grid grid-cols-2 gap-4"
            >
              {statCards.map((stat, i) => (
                <motion.button
                  key={i} 
                  type="button"
                  whileHover={{ scale: 1.02, translateY: -5 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={stat.onClick}
                  className="bg-card rounded-[24px] p-5 shadow-soft border-ceramic flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all cursor-pointer select-none"
                >
                  <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center mb-3 text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-all">
                    <stat.icon size={18} />
                  </div>
                  <span className="text-2xl font-display font-bold text-foreground mb-1">{stat.value}</span>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                </motion.button>
              ))}
            </motion.div>

            {/* Safety Tips Fill Area */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="order-7 xl:col-span-6 bg-card rounded-[28px] p-6 shadow-soft border-ceramic overflow-hidden relative"
            >
               <div className="absolute top-0 right-0 p-4 opacity-5">
                  <Shield size={120} />
               </div>
               <h3 className="text-md font-semibold text-foreground mb-4">{t("Safety Recommendations")}</h3>
               <div className="space-y-3">
                 {[
                   { text: "Enable location sharing for better SOS response", action: "settings", icon: MapPin },
                   { text: "Verify your emergency contacts", action: "profile", icon: Users },
                   { text: reportRecommendationText, action: "report", icon: FileText }
                 ].map((tip, idx) => (
                   <div 
                    key={idx} 
                    onClick={() => {
                      if (tip.action === "settings") navigate("/settings");
                      else if (tip.action === "profile") { window.scrollTo({ top: 300, behavior: 'smooth' }); setShowAddForm(true); }
                      else if (tip.action === "report") navigate("/report");
                    }}
                    className="group flex items-center gap-3 p-3 rounded-2xl bg-muted/30 hover:bg-primary/5 border border-transparent hover:border-primary/20 transition-all cursor-pointer"
                   >
                     <div className="w-8 h-8 rounded-xl bg-background flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                        <tip.icon size={14} />
                     </div>
                     <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex-1">{t(tip.text)}</p>
                     <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0" />
                   </div>
                 ))}
               </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.35 }}
              className="hidden"
            >
              <h3 className="text-lg font-display font-semibold text-foreground mb-4">{t("Account Information")}</h3>
              <div className="space-y-2">
                {[
                  { label: "Email", value: user?.email || "-" },
                  { label: "Role", value: user?.role || "user" },
                  {
                    label: "Member Since",
                    value: user?.created_at
                      ? new Date(user.created_at).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "-",
                  },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className="flex items-center justify-between gap-4 p-3.5 rounded-2xl bg-muted/30"
                  >
                    <span className="text-[13px] text-muted-foreground">{t(stat.label)}</span>
                    <span className="text-sm font-medium text-foreground capitalize text-right break-all">
                      {stat.value}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Activity Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            ref={activitySectionRef}
            className={`order-8 xl:col-span-12 bg-card rounded-[28px] p-6 shadow-soft border-ceramic flex flex-col ${showAllActivity ? "" : "min-h-[400px]"}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-display font-semibold text-foreground">{t("Activity feed")}</h3>
              {(userReports.length > 3 || sosHistory.length > 2) && (
                <span
                  onClick={() => setShowAllActivity(!showAllActivity)}
                  className="text-xs font-medium text-primary cursor-pointer hover:underline"
                >
                  {t(showAllActivity ? "Show less" : "View all")} &gt;
                </span>
              )}
            </div>

            <div className="space-y-4 flex-1 relative px-2">
              {/* Feed Line */}
              <div className="absolute left-6 top-2 bottom-2 w-px bg-muted/50" />

              {userReports.length === 0 && sosHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center opacity-40">
                  <Clock size={40} className="mb-3" />
                  <p className="text-sm font-medium">{t("No recent activity detected.")}</p>
                </div>
              ) : (
                <>
                  {(showAllActivity ? userReports : userReports.slice(0, 5)).map((r) => (
                    <div key={r.id} className="relative flex gap-5 group">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 z-10 border-4 border-card transition-transform group-hover:scale-110">
                        <Eye size={12} />
                      </div>
                      <div className="flex-1 pb-4 border-b border-muted last:border-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">
                          {t("Reported")} <span className="text-primary">{t(r.crime_type)}</span> {t("in")} {r.area_name || t("Unknown Area")}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <Clock size={10} /> {new Date(r.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2 line-clamp-2 italic">"{r.description}"</p>
                      </div>
                    </div>
                  ))}

                  {(showAllActivity ? sosHistory : (userReports.length < 5 ? sosHistory.slice(0, 3) : [])).map((sos) => (
                    <div key={sos.id} className="relative flex gap-5 group">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0 z-10 border-4 border-card transition-transform group-hover:scale-110">
                        <AlertTriangleIcon size={12} />
                      </div>
                      <div className="flex-1 pb-4 border-b border-muted last:border-0">
                        <p className="text-sm font-semibold text-foreground leading-snug">{t("Activated Emergency SOS")}</p>
                        <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                          <MapPin size={10} /> {sos.area_name || t("Current Location")}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {new Date(sos.created_at).toLocaleString()}
                        </p>
                        <div className={`mt-2 inline-block px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${sos.status === "Resolved" ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500 animate-pulse"}`}>
                          {t(sos.status || "Active")}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </motion.div>
        </div>
      </main>
      <SOSButton />
    </div>
  );
}
