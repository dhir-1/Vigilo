import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Home, Map, Route, FileText, User, Settings, ShieldCheck, BarChart3, Menu, X, PlusCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "@/lib/i18n";

const navItems = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Map, label: "Map", path: "/dashboard" },
  { icon: Route, label: "Routes", path: "/route-planner" },
  { icon: PlusCircle, label: "Report", path: "/report" },
  { icon: FileText, label: "Reports", path: "/my-reports" },
  { icon: User, label: "Profile", path: "/profile" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const adminItems = [
  { icon: ShieldCheck, label: "Admin", path: "/admin" },
  { icon: BarChart3, label: "Verify", path: "/admin/verify" },
];

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isAdmin } = useAuth();
  const { t } = useTranslation();

  const allItems = isAdmin 
    ? [...navItems.filter(i => i.label !== "Report" && i.label !== "Reports"), ...adminItems] 
    : navItems;

  useEffect(() => {
    if (!mobileOpen) return undefined;

    const { style } = document.body;
    const previousOverflow = style.overflow;
    style.overflow = "hidden";

    return () => {
      style.overflow = previousOverflow;
    };
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-3 left-3 sm:top-4 sm:left-4 z-50 w-11 h-11 rounded-xl bg-card/95 backdrop-blur border border-border flex items-center justify-center text-foreground shadow-soft"
        aria-label={t("Open navigation")}
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-slate-950/45 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`fixed lg:sticky top-0 z-50 lg:z-10 flex h-screen w-[17rem] max-w-[85vw] flex-col bg-sidebar shadow-soft rounded-r-3xl border-r border-sidebar-border transition-transform duration-300 overflow-y-auto hide-scrollbar lg:w-20 lg:items-center lg:py-8 lg:gap-2 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="lg:hidden flex items-center justify-between px-4 pt-5 pb-4 border-b border-sidebar-border/80">
          <button
            onClick={() => {
              navigate("/dashboard");
              setMobileOpen(false);
            }}
            className="flex items-center gap-3 min-w-0 text-left"
          >
            <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-sm overflow-hidden shrink-0">
              <img src="/logo.png" alt="Vigilo Logo" className="w-full h-full object-contain p-1.5" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground">Vigilo</p>
              <p className="text-xs text-sidebar-foreground/60 truncate">{t("Safety tools for Surat")}</p>
            </div>
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="w-9 h-9 rounded-xl border border-sidebar-border/80 bg-sidebar-accent/50 text-sidebar-foreground flex items-center justify-center"
            aria-label={t("Close navigation")}
          >
            <X size={18} />
          </button>
        </div>

        <button
          onClick={() => {
            navigate("/dashboard");
            setMobileOpen(false);
          }}
          className="hidden lg:flex w-11 h-11 rounded-2xl bg-white items-center justify-center mb-8 shadow-sm overflow-hidden"
        >
          <img src="/logo.png" alt="Vigilo Logo" className="w-full h-full object-contain p-1.5" />
        </button>

        <div className="hidden lg:block w-8 h-px bg-sidebar-border mb-2" />

        <nav className="flex flex-col gap-1 flex-1 px-3 py-4 lg:px-0 lg:py-0 lg:items-center">
          {allItems.map((item) => {
            const Icon = item.icon;
            const active = location.pathname === item.path ||
              (item.path === "/dashboard" && location.pathname === "/dashboard" && item.label === "Dashboard");

            return (
              <button
                key={item.label}
                onClick={() => {
                  navigate(item.path);
                  setMobileOpen(false);
                }}
                className={`h-12 rounded-2xl transition-all duration-250 vigilo-curve w-full px-4 flex items-center justify-start gap-3 lg:w-12 lg:px-0 lg:justify-center ${
                  active
                    ? "bg-sidebar-accent text-sidebar-primary shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                }`}
                title={t(item.label)}
              >
                <Icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-sm font-medium lg:hidden">{t(item.label)}</span>
              </button>
            );
          })}
        </nav>

        <div className="hidden lg:flex w-6 h-6 rounded-full border-2 border-sidebar-primary/30 items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-sidebar-primary/50" />
        </div>
      </aside>
    </>
  );
}
