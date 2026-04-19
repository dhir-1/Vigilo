import { useState, useRef, useEffect } from "react";
import { Search, Bell, LogOut, User, Settings, ShieldCheck, MapPin, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";
import { useGlobalLocation } from "@/context/LocationContext";

export function Navbar({ title, subtitle }) {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const { address, alerts, setAlerts } = useGlobalLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = alerts?.filter((n) => !n.read).length || 0;

  const markAllAsRead = () => {
    setAlerts((alerts ?? []).map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id) => {
    setAlerts((alerts ?? []).map((n) => (n.id === id ? { ...n, read: true } : n)));
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowNotifications(false);
        setShowProfile(false);
        setMobileSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleSearch = (e) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      navigate(`/dashboard?search=${encodeURIComponent(searchQuery.trim())}`);
      setMobileSearchOpen(false);
      setSearchQuery("");
    }
  };

  const initials = user?.full_name
    ? user.full_name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b border-border/60">
      <div className="px-4 sm:px-6 lg:px-10 py-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 pl-14 sm:pl-16 lg:pl-0">
          <h2 className="text-sm sm:text-base font-semibold text-foreground">{t(title) || t("Dashboard")}</h2>
          <div className="flex items-start gap-1.5 text-xs text-muted-foreground mt-0.5">
            <MapPin size={12} className="text-primary mt-0.5 hidden sm:block" />
            <span className="line-clamp-2 max-w-full sm:max-w-xs lg:max-w-md" title={address}>
              {address !== "Locating..." && address !== "GPS not supported" ? address : t(subtitle)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0" ref={dropdownRef}>
          <button
            onClick={() => {
              setMobileSearchOpen((prev) => !prev);
              setShowNotifications(false);
              setShowProfile(false);
            }}
            className="md:hidden w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary transition-all shadow-soft"
            title={t("Search")}
          >
            <Search size={18} />
          </button>

          <div className="relative hidden md:block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={t("Search areas...")}
              className="h-10 pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-56 lg:w-72"
            />
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowNotifications(!showNotifications);
                setShowProfile(false);
                setMobileSearchOpen(false);
              }}
              className="w-10 h-10 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-gold transition-all shadow-soft relative"
              title={t("Notifications")}
            >
              <Bell size={18} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-0.5 bg-accent rounded-full border-2 border-background flex items-center justify-center text-[8px] font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute top-12 right-0 w-80 max-w-[calc(100vw-2rem)] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden py-2 z-[80] animate-in fade-in zoom-in duration-200">
                <div className="px-4 py-2 border-b border-border/50 flex justify-between items-center transition-colors">
                  <span className="font-bold text-sm text-foreground">{t("Notifications")}</span>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold text-primary cursor-pointer hover:underline uppercase tracking-wider"
                    >
                      {t("Mark all as read")}
                    </button>
                  )}
                </div>

                <div className="max-h-[min(24rem,calc(100vh-7rem))] overflow-y-auto overscroll-contain" style={{ scrollbarWidth: "thin" }}>
                  {alerts?.length > 0 ? (
                    alerts.map((n) => {
                      const severityStyles = {
                        high: { bg: "bg-red-500/10", text: "text-red-500", icon: <AlertTriangle size={14} /> },
                        medium: { bg: "bg-amber-500/10", text: "text-amber-500", icon: <ShieldCheck size={14} /> },
                        low: { bg: "bg-green-500/10", text: "text-green-500", icon: <ShieldCheck size={14} /> },
                      };
                      const style = severityStyles[n.severity] || severityStyles.medium;

                      return (
                        <div
                          key={n.id}
                          onClick={() => markAsRead(n.id)}
                          className={`px-4 py-3 hover:bg-muted/50 cursor-pointer border-b border-border/50 flex gap-3 transition-colors ${n.read ? "opacity-60" : "bg-primary/[0.02]"}`}
                        >
                          <div className={`mt-1 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${style.bg} ${style.text}`}>
                            {style.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start gap-2">
                              <p className={`text-sm font-medium text-foreground leading-tight ${!n.read ? "font-bold" : ""}`}>
                                {t(n.title)}
                              </p>
                              {!n.read && <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />}
                            </div>
                            {n.areaName && (
                              <p className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1">
                                <MapPin size={8} /> {n.areaName}
                              </p>
                            )}
                            {n.matchedPlaceLabel && (
                              <p className="text-[10px] text-primary mt-1 font-semibold">
                                {t("Saved place")}: {t(n.matchedPlaceLabel)}
                              </p>
                            )}
                            <p className="text-[10px] text-muted-foreground mt-1">{t(n.time)}</p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="px-4 py-8 text-center">
                      <Bell className="mx-auto text-muted-foreground/20 mb-2" size={32} />
                      <p className="text-xs text-muted-foreground">{t("No more notifications")}</p>
                    </div>
                  )}

                  <div className="px-4 py-2 text-center border-t border-border/20">
                    <button
                      onClick={() => {
                        setShowNotifications(false);
                        navigate("/profile");
                      }}
                      className="text-[10px] text-muted-foreground hover:text-primary transition-colors uppercase font-bold tracking-widest py-1 w-full"
                    >
                      {t("View All Activities")}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setShowProfile(!showProfile);
                setShowNotifications(false);
                setMobileSearchOpen(false);
              }}
              className="group w-10 h-10 rounded-xl bg-primary/10 hover:bg-primary/20 transition-all flex items-center justify-center text-primary font-bold text-sm border border-primary/20 hover:scale-105 active:scale-95 shadow-soft"
              title={t("Profile")}
            >
              {initials}
            </button>

            {showProfile && (
              <div className="absolute top-12 right-0 w-52 max-w-[calc(100vw-2rem)] bg-card border border-border shadow-2xl rounded-2xl overflow-hidden py-1 z-[80] animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="px-4 py-3 border-b border-border/50 bg-muted/20">
                  <p className="text-sm font-bold text-foreground truncate">{user?.full_name}</p>
                  <p className="text-[10px] font-medium text-primary uppercase tracking-widest mt-0.5">{t(user?.role || "User")}</p>
                  <p className="text-[10px] text-muted-foreground truncate mt-1">{user?.email}</p>
                </div>
                <div className="p-1">
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      navigate("/profile");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2 transition-all hover:translate-x-1"
                  >
                    <User size={14} className="text-primary" /> {t("Profile")}
                  </button>
                  {user?.id && (
                    <button
                      onClick={() => {
                        setShowProfile(false);
                        navigate(`/user/${user.id}`);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2 transition-all hover:translate-x-1"
                    >
                      <ShieldCheck size={14} className="text-primary" /> {t("Public Profile")}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowProfile(false);
                      navigate("/settings");
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2 transition-all hover:translate-x-1"
                  >
                    <Settings size={14} className="text-primary" /> {t("Settings")}
                  </button>
                  <div className="h-px bg-border/50 my-1 mx-2" />
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2 transition-all hover:translate-x-1"
                  >
                    <LogOut size={14} /> {t("Logout")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {mobileSearchOpen && (
        <div className="px-4 sm:px-6 pb-4 md:hidden">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
              placeholder={t("Search areas...")}
              className="h-11 w-full pl-9 pr-4 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              autoFocus
            />
          </div>
        </div>
      )}
    </header>
  );
}
