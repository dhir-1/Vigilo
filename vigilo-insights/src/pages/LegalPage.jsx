import { useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/common/Footer";

const DOCUMENTS = {
  "/privacy-policy": {
    title: "Privacy Policy",
    intro: "This policy explains what information Vigilo stores and how it is used inside the app.",
    sections: [
      { heading: "Data We Collect", body: "Vigilo may store account details, reports you submit, emergency contacts, uploaded media, and optional location data used for safety features." },
      { heading: "How We Use It", body: "We use this information to run the safety map, deliver SOS alerts, review reports, and improve community safety features." },
      { heading: "Your Controls", body: "You can update profile settings, export your data, and delete your account from the settings page." },
    ],
  },
  "/terms-of-service": {
    title: "Terms of Service",
    intro: "These terms govern how Vigilo may be used by community members and administrators.",
    sections: [
      { heading: "Acceptable Use", body: "Do not submit false reports, abusive content, or misleading evidence. Reports may be reviewed and rejected by administrators." },
      { heading: "Safety Information", body: "Vigilo provides decision-support information and should not replace emergency services or official law-enforcement instructions." },
      { heading: "Accounts", body: "You are responsible for protecting your account credentials and for the content submitted from your account." },
    ],
  },
  "/cookie-policy": {
    title: "Cookie Policy",
    intro: "Vigilo uses local browser storage and session data to keep the app functional.",
    sections: [
      { heading: "What We Store", body: "The app may store authentication tokens, display preferences, language settings, alerts cache, and map preferences on your device." },
      { heading: "Why We Store It", body: "This helps the app remember your session and provide a consistent experience across pages." },
      { heading: "Managing Storage", body: "You can clear browser storage or delete your account to remove locally stored session data." },
    ],
  },
};

export default function LegalPage() {
  const location = useLocation();
  const document = useMemo(() => DOCUMENTS[location.pathname] || DOCUMENTS["/privacy-policy"], [location.pathname]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <main className="flex-1 px-6 py-10 lg:px-10">
        <div className="max-w-4xl mx-auto space-y-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <ArrowLeft size={14} />
            Back to home
          </Link>

          <div className="bg-card border border-border rounded-[32px] p-8 lg:p-10 shadow-soft space-y-8">
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Vigilo</p>
              <h1 className="text-3xl lg:text-4xl font-display font-bold text-foreground">{document.title}</h1>
              <p className="text-muted-foreground max-w-2xl">{document.intro}</p>
            </div>

            <div className="space-y-6">
              {document.sections.map((section) => (
                <section key={section.heading} className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">{section.heading}</h2>
                  <p className="text-sm leading-relaxed text-muted-foreground">{section.body}</p>
                </section>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
