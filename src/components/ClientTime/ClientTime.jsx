import { useState, useEffect } from 'react';

export function ClientTime({ timezone }) {
  const [timeString, setTimeString] = useState('');

  useEffect(() => {
    if (!timezone) {
      setTimeString('Timezone not set');
      return;
    }

    function updateTime() {
      try {
        const timeStr = new Intl.DateTimeFormat('en-US', {
          timeZone: timezone,
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }).format(new Date());
        const tzName = timezone.split('/').pop().replace(/_/g, ' ');
        setTimeString(`${timeStr} — ${tzName}`);
      } catch (e) {
        setTimeString(timezone);
      }
    }

    updateTime();
    // Update every 10 seconds to ensure it stays in sync relatively well
    const timer = setInterval(updateTime, 10000); 
    return () => clearInterval(timer);
  }, [timezone]);

  return <span>{timeString}</span>;
}
