import { useEffect, useState } from "react";

export function useAutoClearMessage(message: string, delay = 5000) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), delay);
    return () => clearTimeout(timer);
  }, [message, delay]);

  return visible;
}
