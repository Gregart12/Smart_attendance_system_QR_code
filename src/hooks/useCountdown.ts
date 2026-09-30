import { useState, useEffect } from 'react';

export function useCountdown(expiresAtTimestamp: number) {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => Math.max(0, expiresAtTimestamp - Date.now()));

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = Math.max(0, expiresAtTimestamp - Date.now());
      setTimeLeftMs(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAtTimestamp]);

  const isExpired = timeLeftMs <= 0;
  const minutes = Math.floor(timeLeftMs / (1000 * 60));
  const seconds = Math.floor((timeLeftMs % (1000 * 60)) / 1000);

  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return {
    timeLeftMs,
    isExpired,
    minutes,
    seconds,
    formattedTime
  };
}
