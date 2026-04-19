import { useNavigate } from "react-router-dom";
import { MapPin, Clock, Shield, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getStatusColor, getTrustScoreColor } from "@/lib/constants";

export function ReportCard({ report }) {
  const navigate = useNavigate();
  const statusColor = getStatusColor(report.status);
  const scoreColor = getTrustScoreColor(report.trustScore);

  const crimeIcons = {
    theft: "📦", assault: "⚔️", robbery: "💰", vandalism: "🔨",
    harassment: "⚠️", fraud: "📄", burglary: "🏠", drug_related: "💊",
  };

  return (
    <div
      onClick={() => navigate(`/my-reports/${report.id}`)}
      className="bg-card rounded-2xl p-5 shadow-soft border-ceramic hover:shadow-hover transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-lg">
            {crimeIcons[report.crimeType] || "📋"}
          </div>
          <div>
            <p className="text-sm font-bold text-foreground group-hover:text-primary transition-colors capitalize">
              {report.crimeType.replace("_", " ")}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">{report.id}</p>
          </div>
        </div>
        <Badge className={statusColor + " border"}>
          {report.status}
        </Badge>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
        <div className="flex items-center gap-1.5">
          <MapPin size={12} />
          <span>{report.location}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Clock size={12} />
          <span>{report.date} at {report.time}</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="flex items-center gap-1.5">
          <Shield size={12} className="text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Trust Score</span>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreColor}`}>
          {report.trustScore}/100
        </span>
      </div>

      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <Users size={12} />
          Community confirmations
        </span>
        <span className="font-semibold text-foreground">{report.communityConfirmationCount || 0}</span>
      </div>
    </div>
  );
}
