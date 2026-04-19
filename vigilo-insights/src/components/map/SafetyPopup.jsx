import { getTrustScoreColor, getSeverityColor } from "@/lib/constants";
import { reportsAPI } from "@/lib/api";

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("vigilo_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function getIsDarkMode() {
  try {
    const stored = localStorage.getItem("vigilo_dark_mode");
    if (stored !== null) return JSON.parse(stored);
  } catch {}
  return document.documentElement.classList.contains("dark");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    switch (char) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case '"':
        return "&quot;";
      case "'":
        return "&#39;";
      default:
        return char;
    }
  });
}

function titleCase(value) {
  return String(value || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function pluralizePeople(count) {
  return count === 1 ? "person" : "people";
}

function toCssScoreColor(score, isDark) {
  const scoreColor = getTrustScoreColor(score);

  if (scoreColor.includes("green")) {
    return isDark
      ? { fg: "#6ee7b7", bg: "rgba(16, 185, 129, 0.10)", border: "rgba(110, 231, 183, 0.24)" }
      : { fg: "#0f766e", bg: "rgba(236, 253, 245, 0.88)", border: "rgba(16, 185, 129, 0.22)" };
  }

  if (scoreColor.includes("yellow")) {
    return isDark
      ? { fg: "#fcd34d", bg: "rgba(234, 179, 8, 0.10)", border: "rgba(252, 211, 77, 0.24)" }
      : { fg: "#a16207", bg: "rgba(255, 251, 235, 0.92)", border: "rgba(245, 158, 11, 0.24)" };
  }

  return isDark
    ? { fg: "#fda4af", bg: "rgba(244, 63, 94, 0.10)", border: "rgba(251, 113, 133, 0.24)" }
    : { fg: "#be123c", bg: "rgba(255, 241, 242, 0.92)", border: "rgba(244, 63, 94, 0.20)" };
}

function toSeverityColors(severity, isDark) {
  const sevColor = getSeverityColor(severity);

  if (sevColor.includes("red")) {
    return isDark
      ? { fg: "#fb7185", bg: "rgba(127, 29, 29, 0.22)", border: "rgba(251, 113, 133, 0.24)" }
      : { fg: "#dc2626", bg: "rgba(254, 242, 242, 0.92)", border: "rgba(248, 113, 113, 0.26)" };
  }

  if (sevColor.includes("yellow")) {
    return isDark
      ? { fg: "#fbbf24", bg: "rgba(120, 53, 15, 0.24)", border: "rgba(251, 191, 36, 0.26)" }
      : { fg: "#b45309", bg: "rgba(255, 251, 235, 0.94)", border: "rgba(245, 158, 11, 0.24)" };
  }

  return isDark
    ? { fg: "#4ade80", bg: "rgba(20, 83, 45, 0.22)", border: "rgba(74, 222, 128, 0.22)" }
    : { fg: "#15803d", bg: "rgba(240, 253, 244, 0.94)", border: "rgba(74, 222, 128, 0.22)" };
}

function getPopupPalette(isDark) {
  if (isDark) {
    return {
      background:
        "radial-gradient(circle at top right, rgba(99, 102, 241, 0.14), transparent 36%), linear-gradient(180deg, rgba(19, 23, 35, 0.98), rgba(12, 16, 28, 0.98))",
      text: "#f8fafc",
      muted: "#94a3b8",
      soft: "#cbd5e1",
      divider: "rgba(148, 163, 184, 0.14)",
      cardBg: "rgba(255, 255, 255, 0.04)",
      cardBorder: "rgba(148, 163, 184, 0.14)",
      cardHighlight: "rgba(255, 255, 255, 0.04)",
      cardShadow: "rgba(2, 6, 23, 0.24)",
      iconBg: "rgba(99, 102, 241, 0.12)",
      iconFg: "#a5b4fc",
      link: "#e0e7ff",
      confirmBg: "linear-gradient(180deg, rgba(10, 47, 38, 0.88), rgba(10, 31, 27, 0.96))",
      confirmBorder: "rgba(52, 211, 153, 0.18)",
      confirmTitle: "#9ce7c6",
      confirmCopy: "rgba(220, 252, 231, 0.76)",
      countBg: "rgba(255, 255, 255, 0.08)",
      countColor: "#ecfdf5",
      scoreLabel: "#e2e8f0",
      quoteBg: "rgba(255, 255, 255, 0.03)",
      quoteBorder: "rgba(148, 163, 184, 0.12)",
      quoteLine: "rgba(129, 140, 248, 0.45)",
      success: "#22c55e",
      shadow: "0 18px 44px rgba(0, 0, 0, 0.42), 0 6px 18px rgba(0, 0, 0, 0.26)",
    };
  }

  return {
    background:
      "radial-gradient(circle at top right, rgba(99, 102, 241, 0.08), transparent 38%), linear-gradient(180deg, rgba(255, 251, 245, 0.98), rgba(250, 244, 236, 0.98))",
    text: "#1f2937",
    muted: "#64748b",
    soft: "#475569",
    divider: "rgba(148, 163, 184, 0.18)",
    cardBg: "rgba(255, 255, 255, 0.82)",
    cardBorder: "rgba(203, 213, 225, 0.75)",
    cardHighlight: "rgba(255, 255, 255, 0.82)",
    cardShadow: "rgba(191, 166, 122, 0.12)",
    iconBg: "rgba(79, 70, 229, 0.08)",
    iconFg: "#4338ca",
    link: "#1d4ed8",
    confirmBg: "linear-gradient(180deg, rgba(236, 253, 245, 0.95), rgba(220, 252, 231, 0.93))",
    confirmBorder: "rgba(16, 185, 129, 0.16)",
    confirmTitle: "#047857",
    confirmCopy: "rgba(6, 95, 70, 0.82)",
    countBg: "rgba(255, 255, 255, 0.84)",
    countColor: "#047857",
    scoreLabel: "#1f2937",
    quoteBg: "rgba(255, 255, 255, 0.74)",
    quoteBorder: "rgba(191, 219, 254, 0.46)",
    quoteLine: "rgba(79, 70, 229, 0.28)",
    success: "#059669",
    shadow: "0 24px 48px rgba(45, 30, 10, 0.14), 0 10px 22px rgba(79, 70, 229, 0.08)",
  };
}

function getButtonTheme({ isDark, isOwnReport, hasConfirmed }) {
  if (isOwnReport) {
    return isDark
      ? {
          bg: "rgba(148, 163, 184, 0.12)",
          border: "rgba(148, 163, 184, 0.18)",
          color: "#cbd5e1",
          shadow: "none",
        }
      : {
          bg: "rgba(241, 245, 249, 0.92)",
          border: "rgba(203, 213, 225, 0.72)",
          color: "#64748b",
          shadow: "none",
        };
  }

  if (hasConfirmed) {
    return isDark
      ? {
          bg: "rgba(236, 253, 245, 0.08)",
          border: "rgba(167, 243, 208, 0.26)",
          color: "#d1fae5",
          shadow: "0 10px 24px rgba(16, 185, 129, 0.10)",
        }
      : {
          bg: "rgba(236, 253, 245, 0.88)",
          border: "rgba(16, 185, 129, 0.22)",
          color: "#047857",
          shadow: "0 12px 24px rgba(16, 185, 129, 0.10)",
        };
  }

  return {
    bg: "linear-gradient(135deg, #0f8a67, #23c297)",
    border: "rgba(16, 185, 129, 0.18)",
    color: "#ffffff",
    shadow: "0 14px 28px rgba(16, 185, 129, 0.24)",
  };
}

export function buildPopupElement(marker, onConfirmationChange) {
  const root = document.createElement("div");
  const currentUser = getCurrentUser();
  const isOwnReport = !!currentUser?.id && currentUser.id === marker.reporter_id;
  const reportId = marker.reportId || marker.id;
  const crimeLabel = escapeHtml(titleCase(marker.type));
  const reporterName = escapeHtml(marker.reporter_name || "Community Member");
  const reporterLink = marker.reporter_id ? `/user/${encodeURIComponent(String(marker.reporter_id))}` : "#";
  const reporterMarkup = marker.reporter_id
    ? `<a href="${reporterLink}" class="vigilo-popup-link">${reporterName}</a>`
    : `<span class="vigilo-popup-link is-static">${reporterName}</span>`;
  const area = escapeHtml(marker.area || "Unknown area");
  const dateLabel = escapeHtml(marker.date || "Unknown date");
  const timeLabel = escapeHtml(marker.time || "Unknown time");
  const description = marker.description ? escapeHtml(marker.description) : "";

  let communityCount = Number(marker.communityConfirmationCount || 0);
  let hasConfirmed = Boolean(marker.viewerHasConfirmed);
  let currentScore = Number(marker.safetyScore || 0);
  let isSubmitting = false;
  let isAnimatingSuccess = false;
  let errorMessage = "";
  let pulseTimeoutId = null;

  const isOfficial = marker.data_source === "official_centroid";
  const sourceLabel = isOfficial ? "Official Statistics" : "Community Report";
  const precisionLabel = isOfficial ? "Area-level Estimate" : "Exact Location";

  const render = () => {
    const isDark = getIsDarkMode();
    const theme = getPopupPalette(isDark);
    const severity = toSeverityColors(marker.severity, isDark);
    const score = toCssScoreColor(currentScore, isDark);
    const buttonTheme = getButtonTheme({ isDark, isOwnReport, hasConfirmed });
    const confirmationSummary =
      communityCount > 0
        ? `${communityCount} ${pluralizePeople(communityCount)} confirmed this incident.`
        : "No community confirmations yet.";

    root.innerHTML = `
      <div
        class="vigilo-map-popup-shell"
        style="
          --vigilo-popup-bg:${theme.background};
          --vigilo-popup-text:${theme.text};
          --vigilo-popup-muted:${theme.muted};
          --vigilo-popup-soft:${theme.soft};
          --vigilo-popup-divider:${theme.divider};
          --vigilo-popup-card-bg:${theme.cardBg};
          --vigilo-popup-card-border:${theme.cardBorder};
          --vigilo-popup-card-highlight:${theme.cardHighlight};
          --vigilo-popup-card-shadow:${theme.cardShadow};
          --vigilo-popup-icon-bg:${theme.iconBg};
          --vigilo-popup-icon-fg:${theme.iconFg};
          --vigilo-popup-link:${theme.link};
          --vigilo-popup-confirm-bg:${theme.confirmBg};
          --vigilo-popup-confirm-border:${theme.confirmBorder};
          --vigilo-popup-confirm-title:${theme.confirmTitle};
          --vigilo-popup-confirm-copy:${theme.confirmCopy};
          --vigilo-popup-count-bg:${theme.countBg};
          --vigilo-popup-count-color:${theme.countColor};
          --vigilo-popup-score-label:${theme.scoreLabel};
          --vigilo-popup-quote-bg:${theme.quoteBg};
          --vigilo-popup-quote-border:${theme.quoteBorder};
          --vigilo-popup-quote-line:${theme.quoteLine};
          --vigilo-popup-success:${theme.success};
          --vigilo-popup-shadow:${theme.shadow};
          --vigilo-severity-fg:${severity.fg};
          --vigilo-severity-bg:${severity.bg};
          --vigilo-severity-border:${severity.border};
        "
      >
        <div class="vigilo-map-popup-inner">
          <div class="vigilo-popup-header">
            <div class="vigilo-popup-severity-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>
                <path d="M12 9v4"/><path d="M12 17h.01"/>
              </svg>
            </div>
            <div class="vigilo-popup-header-copy">
              <span class="vigilo-popup-title">${crimeLabel}</span>
              <div class="flex gap-2" style="font-size: 11px; margin-top: 4px; font-weight: 500;">
                 <span style="color: ${isOfficial ? '#3b82f6' : '#8b5cf6'}">${sourceLabel}</span>
                 <span style="color: var(--vigilo-popup-muted)">• ${precisionLabel}</span>
              </div>
            </div>
          </div>

          <div class="vigilo-popup-meta-stack">
            <div class="vigilo-popup-meta-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              <span>${area}</span>
            </div>
            <div class="vigilo-popup-meta-row">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>${dateLabel} at ${timeLabel}</span>
            </div>
          </div>

          <div class="vigilo-popup-card vigilo-popup-reporter-card">
            <div class="vigilo-popup-avatar">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div class="vigilo-popup-stack">
              <span class="vigilo-popup-label">Reporter</span>
              ${reporterMarkup}
            </div>
          </div>

          <div class="vigilo-popup-card vigilo-popup-confirm-card ${isAnimatingSuccess ? "vigilo-confirm-pop" : ""}">
            <div class="vigilo-popup-card-head">
              <div class="vigilo-popup-card-headline">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                  <path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span>Community confirmations</span>
              </div>
              <span class="vigilo-popup-count ${isAnimatingSuccess ? "vigilo-badge-pop" : ""}">${communityCount}</span>
            </div>
            <p class="vigilo-popup-copy">${confirmationSummary}</p>
            ${
              reportId
                ? `<button
                    type="button"
                    data-confirm-button="true"
                    class="vigilo-confirm-button ${hasConfirmed ? "is-confirmed" : ""} ${isOwnReport ? "is-own" : ""} ${isAnimatingSuccess ? "vigilo-confirm-pop" : ""}"
                    style="
                      --vigilo-confirm-button-bg:${buttonTheme.bg};
                      --vigilo-confirm-button-border:${buttonTheme.border};
                      --vigilo-confirm-button-color:${buttonTheme.color};
                      --vigilo-confirm-button-shadow:${buttonTheme.shadow};
                    "
                    ${isOwnReport || isSubmitting ? "disabled" : ""}
                  >
                    ${isSubmitting ? "Updating..." : isOwnReport ? "Your report" : hasConfirmed ? "Confirmed by you" : "I witnessed this too"}
                  </button>`
                : ""
            }
            ${
              errorMessage
                ? `<p class="vigilo-popup-error">${escapeHtml(errorMessage)}</p>`
                : '<p class="vigilo-popup-error is-hidden" data-confirm-error="true"></p>'
            }
          </div>

          <div class="vigilo-popup-card vigilo-popup-score-card">
            <div class="vigilo-popup-card-head">
              <div class="vigilo-popup-card-headline">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/>
                </svg>
                <div class="vigilo-popup-stack">
                  <span class="vigilo-popup-score-title">Safety Score</span>
                  ${
                    marker.communityTrustBoost > 0
                      ? `<span class="vigilo-popup-score-copy">Includes +${marker.communityTrustBoost} community trust boost</span>`
                      : `<span class="vigilo-popup-score-copy">AI score + community signal</span>`
                  }
                </div>
              </div>
              <span
                class="vigilo-popup-score-pill ${isAnimatingSuccess ? "vigilo-badge-pop" : ""}"
                style="
                  --vigilo-score-fg:${score.fg};
                  --vigilo-score-bg:${score.bg};
                  --vigilo-score-border:${score.border};
                "
              >
                ${currentScore}/100
              </span>
            </div>
          </div>

          ${
            description
              ? `<div class="vigilo-popup-verified">
                  <div class="vigilo-popup-verified-head">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                    <span>Verified report</span>
                  </div>
                  <p class="vigilo-popup-quote">"${description}"</p>
                </div>`
              : ""
          }
        </div>
      </div>
    `;

    const button = root.querySelector('[data-confirm-button="true"]');

    if (button && !isOwnReport) {
      button.addEventListener("click", async (event) => {
        event.preventDefault();
        event.stopPropagation();

        if (isSubmitting) return;

        isSubmitting = true;
        errorMessage = "";
        render();

        try {
          const updatedReport = hasConfirmed
            ? await reportsAPI.unconfirm(reportId)
            : await reportsAPI.confirm(reportId);

          communityCount = Number(updatedReport.community_confirmation_count || 0);
          hasConfirmed = Boolean(updatedReport.viewer_has_confirmed);
          currentScore = Number(updatedReport.trust_score ?? currentScore);
          isSubmitting = false;
          isAnimatingSuccess = true;
          errorMessage = "";
          onConfirmationChange?.(updatedReport);

          if (pulseTimeoutId) {
            window.clearTimeout(pulseTimeoutId);
          }

          render();

          pulseTimeoutId = window.setTimeout(() => {
            isAnimatingSuccess = false;
            render();
          }, 560);
        } catch (err) {
          isSubmitting = false;
          errorMessage = err.message || "Failed to update confirmation.";
          render();
        }
      });
    }
  };

  const handleThemeRefresh = () => {
    render();
  };

  const themeObserver = new MutationObserver(() => {
    render();
  });

  window.addEventListener("settings-changed", handleThemeRefresh);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });

  root.__vigiloCleanup = () => {
    if (pulseTimeoutId) {
      window.clearTimeout(pulseTimeoutId);
    }
    window.removeEventListener("settings-changed", handleThemeRefresh);
    themeObserver.disconnect();
  };

  render();
  return root;
}
