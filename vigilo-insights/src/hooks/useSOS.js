import { useState, useCallback, useRef } from "react";
import { sosAPI } from "@/lib/api";

export function useSOS() {
  const [isActive, setIsActive] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [alertId, setAlertId] = useState(null);
  const [isResolving, setIsResolving] = useState(false);
  const [error, setError] = useState(null);
  const timerRef = useRef(null);

  const sendSOS = useCallback(async () => {
    setError(null);
    try {
      // Try to get GPS coordinates
      let latitude = null;
      let longitude = null;

      try {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        // GPS denied or unavailable — send null coords
      }

      const data = await sosAPI.trigger(latitude, longitude);
      setAlertId(data.id);
      return data;
    } catch (err) {
      setError(err.message || "Failed to send SOS alert");
      throw err;
    }
  }, []);

  const triggerSOS = useCallback(() => {
    setIsActive(true);
    setCountdown(5);
    setError(null);

    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          // Countdown reached 0 — send SOS
          sendSOS()
            .then(() => {
              setIsActive(false);
              setCountdown(5);
            })
            .catch(() => {
              setIsActive(false);
              setCountdown(5);
            });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [sendSOS]);

  const cancelSOS = useCallback(() => {
    clearInterval(timerRef.current);
    setIsActive(false);
    setCountdown(5);
    setError(null);
  }, []);

  const resolveSOS = useCallback(async () => {
    if (!alertId) return;
    setIsResolving(true);
    setError(null);
    try {
      await sosAPI.resolve(alertId);
      setAlertId(null);
    } catch (err) {
      setError(err.message || "Failed to resolve SOS");
    } finally {
      setIsResolving(false);
    }
  }, [alertId]);

  return {
    isActive,
    countdown,
    alertId,
    isResolving,
    error,
    triggerSOS,
    cancelSOS,
    resolveSOS,
  };
}
