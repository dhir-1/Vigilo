import { CheckCircle, XCircle, AlertTriangle, Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";

function AnalysisItem({ label, status, detail, score }) {
  const getIcon = () => {
    switch (status) {
      case "pass": return <CheckCircle size={16} className="text-green-500" />;
      case "fail": return <XCircle size={16} className="text-red-500" />;
      case "warning": return <AlertTriangle size={16} className="text-yellow-500" />;
      default: return <Info size={16} className="text-blue-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "pass": return "text-green-600 bg-green-500/10";
      case "fail": return "text-red-600 bg-red-500/10";
      case "warning": return "text-yellow-600 bg-yellow-500/10";
      default: return "text-blue-600 bg-blue-500/10";
    }
  };

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-muted/30">
      <div className={`p-1.5 rounded-lg ${getStatusColor()}`}>
        {getIcon()}
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-medium text-foreground">{label}</span>
          {score !== undefined && (
            <span className="text-xs font-bold text-foreground">{score}%</span>
          )}
          {status && !score && (
            <span className={`text-xs font-bold capitalize px-2 py-0.5 rounded-full ${getStatusColor()}`}>
              {status}
            </span>
          )}
        </div>
        {score !== undefined && (
          <Progress value={score} className="h-1.5 mb-1" />
        )}
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
    </div>
  );
}

export function AIAnalysisPanel({ analysis }) {
  if (!analysis) return null;

  return (
    <div className="bg-card rounded-2xl p-6 shadow-soft border-ceramic">
      <h3 className="text-lg font-display font-semibold text-foreground mb-4">AI Analysis Results</h3>
      <div className="space-y-3">
        <AnalysisItem
          label="EXIF Data Check"
          status={analysis.exifCheck.status}
          detail={analysis.exifCheck.detail}
        />
        <AnalysisItem
          label="AI-Generated Detection"
          status={analysis.aiDetection.status}
          detail={analysis.aiDetection.detail}
        />
        <AnalysisItem
          label="Image-Text Consistency"
          score={analysis.imageTextConsistency.score}
          detail={analysis.imageTextConsistency.detail}
        />
        <AnalysisItem
          label="Image Quality"
          status={analysis.imageQuality.status}
          detail={analysis.imageQuality.detail}
        />
      </div>
    </div>
  );
}
