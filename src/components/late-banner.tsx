'use client';
import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

export function LateBanner() {
  const [centers, setCenters] = useState<{ location_id: string; name: string }[]>([]);
  useEffect(() => {
    let prev = 0;
    const poll = async () => {
      const res = await fetch('/api/late-centers');
      if (!res.ok) return;
      const d = await res.json();
      setCenters(d.centers ?? []);
      // PWA local notification when the late set grows
      if ((d.centers?.length ?? 0) > prev && 'Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('مراكز متأخرة عن التفقّد', { body: `${d.centers.length} مركز لم يُرسل تفقّد اليوم`, icon: '/brand/eagle.png' });
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission();
        }
      }
      prev = d.centers?.length ?? 0;
    };
    poll();
    const t = setInterval(poll, 5 * 60 * 1000); // every 5 minutes
    return () => clearInterval(t);
  }, []);

  if (centers.length === 0) return null;
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
      <div className="flex items-center gap-2 text-sm font-medium text-amber-800">
        <AlertTriangle size={16} /> مراكز متأخرة عن تفقّد اليوم ({centers.length})
      </div>
      <div className="mt-1 text-xs text-amber-700">{centers.map((c) => c.name).join('، ')}</div>
    </div>
  );
}
