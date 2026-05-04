import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Zap } from "lucide-react";

const XP_PER_LEVEL = 1000;

type XPGain = { id: number; amount: number };

export function XPStatus() {
  const { user, profile, refreshProfile } = useAuth();
  const [xp, setXp] = useState<number>(profile?.xp_total ?? 0);
  const [level, setLevel] = useState<number>(profile?.level ?? 1);
  const [gains, setGains] = useState<XPGain[]>([]);
  const prevXpRef = useRef<number>(profile?.xp_total ?? 0);
  const gainIdRef = useRef(0);
  const initializedRef = useRef(false);

  // Initial fetch — don't rely solely on AuthContext profile
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("xp_total, level")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled || error || !data) return;
      const newXp = data.xp_total ?? 0;
      const newLevel = data.level ?? 1;
      setXp(newXp);
      setLevel(newLevel);
      prevXpRef.current = newXp;
      initializedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // Sync local state when AuthContext profile changes (e.g. on first load)
  useEffect(() => {
    if (!profile) return;
    const newXp = profile.xp_total ?? 0;
    const newLevel = profile.level ?? 1;
    // Only sync if we haven't received a more recent realtime update
    if (!initializedRef.current) {
      setXp(newXp);
      setLevel(newLevel);
      prevXpRef.current = newXp;
      initializedRef.current = true;
    }
  }, [profile?.xp_total, profile?.level]);

  // Realtime subscription on profiles row — fires on any UPDATE
  useEffect(() => {
    if (!user?.id) return;

    const handleUpdate = (payload: any) => {
      const next = payload.new as { xp_total: number | null; level: number | null };
      const newXp = next?.xp_total ?? 0;
      const newLevel = next?.level ?? 1;
      const delta = newXp - prevXpRef.current;
      if (delta > 0) {
        const id = ++gainIdRef.current;
        setGains((g) => [...g, { id, amount: delta }]);
        setTimeout(() => {
          setGains((g) => g.filter((x) => x.id !== id));
        }, 1800);
      }
      prevXpRef.current = newXp;
      setXp(newXp);
      setLevel(newLevel);
      // Keep AuthContext profile in sync (best-effort)
      void refreshProfile();
    };

    const channel = supabase
      .channel(`xp-realtime-${user.id}-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        handleUpdate,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          // eslint-disable-next-line no-console
          console.debug("[XPStatus] Realtime subscribed for user", user.id);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user?.id, refreshProfile]);

  const { displayLevel, xpInLevel, pct } = useMemo(() => {
    const lvl = Math.max(1, Math.floor(xp / XP_PER_LEVEL) + 1);
    const inLevel = xp % XP_PER_LEVEL;
    return {
      displayLevel: level && level > 0 ? level : lvl,
      xpInLevel: inLevel,
      pct: (inLevel / XP_PER_LEVEL) * 100,
    };
  }, [xp, level]);

  return (
    <div className="xp-status relative font-mono">
      <div className="flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.18em]">
        <span className="flex items-center gap-1.5 xp-status__label">
          <Zap className="h-3 w-3" />
          Nível {displayLevel}
        </span>
        <span className="xp-status__value tabular-nums">
          {xpInLevel.toString().padStart(4, "0")}/{XP_PER_LEVEL} XP
        </span>
      </div>
      <div className="xp-status__bar mt-1.5">
        <div
          className="xp-status__fill"
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>

      {/* Floating XP gain popups */}
      <div className="pointer-events-none absolute -top-2 right-0 flex flex-col items-end gap-1">
        {gains.map((g) => (
          <span key={g.id} className="xp-status__gain font-mono text-sm font-bold">
            +{g.amount} XP
          </span>
        ))}
      </div>
    </div>
  );
}

export default XPStatus;
