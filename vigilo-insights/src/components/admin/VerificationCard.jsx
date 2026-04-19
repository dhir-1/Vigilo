import { useNavigate } from "react-router-dom";
import { MapPin, Clock, User, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getStatusColor, getTrustScoreColor, getSeverityColor } from "@/lib/constants";

export function VerificationCard({ report }) {
  const navigate = useNavigate();
  const scoreColor = getTrustScoreColor(report.trustScore);
  const sevColor = getSeverityColor(report.severity);

  return (
    <div className="bg-card rounded-2xl p-5 shadow-soft border-ceramic hover:shadow-hover transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${sevColor}`}>
            <AlertTriangle size={18} />
          </div>
          <div>
            <p className="text-sm font-bold text-foreground capitalize">
              {report.crimeType.replace("_", " ")}
            </p>
            <p className="text-[11px] text-muted-foreground font-mono">{report.id}</p>
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${scoreColor}`}>
          {report.trustScore}
        </span>
      </div>

      <div className="space-y-1.5 text-xs text-muted-foreground mb-3">
        {report.userName && (
          <div className="flex items-center gap-1.5">
            <User size={12} />
            <span>{report.userName}</span>
          </div>
        )}
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
        <Badge className={getSeverityColor(report.severity) + " border capitalize"}>
          {report.severity} severity
        </Badge>
        <Button
          size="sm"
          onClick={() => navigate(`/admin/verify/${report.id}`)}
          className="h-8"
        >
          Review
        </Button>
      </div>
    </div>
  );
}
