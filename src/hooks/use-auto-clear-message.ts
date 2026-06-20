import { useEffect, useState } from "react";

export function useAutoClearMessage(message: string, delay = 5000) {
  const [clearedAtMessage, setClearedAtMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message || message === clearedAtMessage) return;
    const timer = setTimeout(() => setClearedAtMessage(message), delay);
    return () => clearTimeout(timer);
  }, [message, delay, clearedAtMessage]);

  return message ? message !== clearedAtMessage : false;
}
