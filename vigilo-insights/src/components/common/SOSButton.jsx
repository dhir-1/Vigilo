import { Phone, CheckCircle } from "lucide-react";
import { useSOS } from "@/hooks/useSOS";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function SOSButton() {
  const { isActive, countdown, alertId, isResolving, error, triggerSOS, cancelSOS, resolveSOS } = useSOS();

  return (
    <>
      <button
        onClick={triggerSOS}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 w-14 h-14 sm:w-[60px] sm:h-[60px] rounded-full bg-red-600 text-white flex items-center justify-center shadow-xl hover:bg-red-700 transition-all animate-sos-pulse"
        title="Emergency SOS"
      >
        <Phone size={24} className="fill-white" />
      </button>

      <Dialog open={isActive} onOpenChange={(open) => !open && cancelSOS()}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] rounded-2xl text-center">
          <DialogHeader>
            <DialogTitle className="text-2xl text-destructive">SOS Alert</DialogTitle>
            <DialogDescription className="text-base">
              {countdown > 0
                ? "Emergency alert will be sent in"
                : "Sending SOS alert..."}
            </DialogDescription>
          </DialogHeader>
          <div className="py-6">
            <div className="w-24 h-24 rounded-full bg-red-600 text-white flex items-center justify-center mx-auto text-4xl font-bold animate-pulse">
              {countdown}
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Your location and emergency contacts will be notified.
            </p>
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" size="lg" onClick={cancelSOS}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!alertId && !isActive} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md max-w-[calc(100vw-2rem)] rounded-2xl text-center">
          <DialogHeader>
            <DialogTitle className="text-xl text-foreground">SOS Alert Active</DialogTitle>
            <DialogDescription>
              Emergency contacts and authorities have been notified.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              When you are safe, tap the button below to resolve the alert.
            </p>
            <Button
              onClick={resolveSOS}
              disabled={isResolving}
              className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white"
              size="lg"
            >
              <CheckCircle size={18} />
              {isResolving ? "Resolving..." : "I'm Safe Now"}
            </Button>
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
