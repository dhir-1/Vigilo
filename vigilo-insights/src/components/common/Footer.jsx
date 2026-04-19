import { Github, Mail, Shield, Twitter } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function Footer() {
  const navigate = useNavigate();
  const githubUrl = import.meta.env.VITE_GITHUB_URL?.trim();
  const twitterUrl = import.meta.env.VITE_TWITTER_URL?.trim();

  const productLinks = [
    { label: "Crime Map", path: "/dashboard" },
    { label: "Route Planner", path: "/route-planner" },
    { label: "SOS Alerts", path: "/dashboard" },
    { label: "Report Incident", path: "/report" },
  ];

  const companyLinks = [
    { label: "About Us", action: () => scrollToSection("features-section") },
    { label: "How It Works", action: () => scrollToSection("how-it-works") },
    { label: "Get Started", action: () => navigate("/register") },
    {
      label: "Contact",
      action: () => {
        window.location.href = "mailto:support@vigilo.app";
      },
    },
  ];

  const legalLinks = [
    { label: "Privacy Policy", path: "/privacy-policy" },
    { label: "Terms of Service", path: "/terms-of-service" },
    { label: "Cookie Policy", path: "/cookie-policy" },
  ];

  const socialLinks = [
    { href: "mailto:support@vigilo.app", label: "Email us", icon: Mail },
    ...(githubUrl ? [{ href: githubUrl, label: "GitHub", icon: Github }] : []),
    ...(twitterUrl ? [{ href: twitterUrl, label: "Twitter", icon: Twitter }] : []),
  ];

  function scrollToSection(id) {
    const element = document.getElementById(id);

    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      return;
    }

    navigate(`/#${id}`);
  }

  return (
    <footer className="bg-sidebar text-sidebar-foreground py-12 px-6 lg:px-16 mt-auto">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate("/")}>
              <img src="/logo.png" alt="Vigilo Logo" className="w-10 h-10 object-contain" />
              <span className="font-display text-xl font-bold text-sidebar-foreground">Vigilo</span>
            </div>

            <p className="text-sm text-sidebar-foreground/60 leading-relaxed">
              AI-powered crime mapping and community safety platform. Making cities safer, one report at a time.
            </p>

            <div className="flex items-center gap-3 pt-1">
              {socialLinks.map((link) => {
                const Icon = link.icon;

                return (
                  <a
                    key={link.label}
                    href={link.href}
                    target={link.href.startsWith("mailto:") ? undefined : "_blank"}
                    rel={link.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
                    className="w-8 h-8 rounded-lg bg-sidebar-foreground/10 flex items-center justify-center hover:bg-sidebar-primary/30 transition-colors"
                    aria-label={link.label}
                  >
                    <Icon size={14} className="text-sidebar-foreground/60" />
                  </a>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-sidebar-primary">Product</h4>
            <ul className="space-y-2 text-sm text-sidebar-foreground/60">
              {productLinks.map((link) => (
                <li
                  key={link.label}
                  className="hover:text-sidebar-foreground cursor-pointer transition-colors"
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-sidebar-primary">Company</h4>
            <ul className="space-y-2 text-sm text-sidebar-foreground/60">
              {companyLinks.map((link) => (
                <li
                  key={link.label}
                  className="hover:text-sidebar-foreground cursor-pointer transition-colors"
                  onClick={link.action}
                >
                  {link.label}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-4 text-sidebar-primary">Legal</h4>
            <ul className="space-y-2 text-sm text-sidebar-foreground/60">
              {legalLinks.map((link) => (
                <li
                  key={link.label}
                  className="hover:text-sidebar-foreground cursor-pointer transition-colors"
                  onClick={() => navigate(link.path)}
                >
                  {link.label}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-sidebar-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-sidebar-foreground/40">
            (c) {new Date().getFullYear()} Vigilo. All rights reserved.
          </p>

          <div className="flex items-center gap-1 text-xs text-sidebar-foreground/40">
            <Shield size={14} />
            <span>Built for community safety</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
