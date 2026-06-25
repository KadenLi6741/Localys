"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Clock, MapPin, Navigation } from "lucide-react";
import { getNearbyOpenBusinesses, type NearbyBusiness } from "../lib/supabase/businesses";
import { formatTime12h } from "../lib/utils/hours";

type LocationState = "idle" | "locating" | "loading" | "ready" | "denied" | "error";

// Placeholder spots shown for looks when nothing real is open nearby.
const DEMO_BUSINESSES: NearbyBusiness[] = [
  { id: "demo-1", name: "Lorem Bistro & Bar", category: "Restaurant", imageUrl: "/landing/biz-aneals.png", latitude: 43.8828, longitude: -79.4403, distanceKm: 0.4, status: { open: true, closesAt: "23:00", minutesUntilClose: 180 } },
  { id: "demo-2", name: "Ipsum Pastry House", category: "Bakery", imageUrl: "/landing/biz-ana-pastry.png", latitude: 43.8801, longitude: -79.4372, distanceKm: 0.9, status: { open: true, closesAt: "22:00", minutesUntilClose: 45 } },
  { id: "demo-3", name: "Dolor Wellness Studio", category: "Wellness", imageUrl: "/landing/biz-align.png", latitude: 43.8765, longitude: -79.4288, distanceKm: 1.3, status: { open: true, closesAt: "21:00", minutesUntilClose: 120 } },
  { id: "demo-4", name: "Amet Print & Sign", category: "Service", imageUrl: "/landing/biz-advanced-printing.png", latitude: 43.8719, longitude: -79.4419, distanceKm: 2.1, status: { open: true, closesAt: "20:00", minutesUntilClose: 30 } },
  { id: "demo-5", name: "Consectetur Acupuncture", category: "Wellness", imageUrl: "/landing/biz-acuvega.png", latitude: 43.8902, longitude: -79.4356, distanceKm: 2.6, status: { open: true, closesAt: "22:30", minutesUntilClose: 150 } },
  { id: "demo-6", name: "Adipiscing Animal Hospital", category: "Service", imageUrl: "/landing/biz-arnold.png", latitude: 43.8674, longitude: -79.4301, distanceKm: 3.4, status: { open: true, closesAt: "23:30", minutesUntilClose: 210 } },
];

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function formatClock(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

export default function OpenNowNearby() {
  const [state, setState] = useState<LocationState>("idle");
  const [businesses, setBusinesses] = useState<NearbyBusiness[]>([]);
  const [now, setNow] = useState<Date | null>(null);

  // Live clock — drives the "it's 9:40 PM" urgency framing.
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const findNearby = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setState("error");
      return;
    }

    setState("locating");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setState("loading");
        const { data, error } = await getNearbyOpenBusinesses(
          pos.coords.latitude,
          pos.coords.longitude
        );
        if (error) {
          setState("error");
          return;
        }
        setBusinesses(data);
        setState("ready");
      },
      (err) => {
        setState(err.code === err.PERMISSION_DENIED ? "denied" : "error");
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 5 * 60_000 }
    );
  }, []);

  return (
    <section className="mx-auto mt-16 max-w-6xl px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-accent">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
            </span>
            Open right now
          </div>
          <h2 className="mt-2 font-display text-3xl uppercase tracking-tight sm:text-4xl">
            Still open near you
          </h2>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {now
              ? `It's ${formatClock(now)} — here's what's open and worth it right now.`
              : "Here's what's open and worth it right now."}
          </p>
        </div>

        {state === "ready" && businesses.length > 0 && (
          <button
            onClick={findNearby}
            className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-2 text-sm font-semibold transition hover:bg-secondary/80"
          >
            <Navigation size={15} />
            Refresh
          </button>
        )}
      </div>

      {/* Idle — ask for location */}
      {state === "idle" && (
        <div className="mt-8 flex flex-col items-center gap-4 rounded-2xl border border-border bg-card/50 px-6 py-12 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-accent/15 text-accent">
            <Navigation size={22} />
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Share your location and we&apos;ll show the local spots open right now, nearest first.
          </p>
          <button
            onClick={findNearby}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:scale-[1.02]"
          >
            <MapPin size={16} />
            Use my location
          </button>
        </div>
      )}

      {/* Locating / loading */}
      {(state === "locating" || state === "loading") && (
        <div className="mt-8 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square rounded-xl bg-muted" />
              <div className="mt-3 h-4 w-3/4 rounded bg-muted" />
              <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
            </div>
          ))}
        </div>
      )}

      {/* Results (falls back to sample spots when nothing real is open or
          location is unavailable) */}
      {(state === "ready" || state === "denied" || state === "error") && (() => {
        const usingDemo = state !== "ready" || businesses.length === 0;
        const display = usingDemo ? DEMO_BUSINESSES : businesses;
        return (
        <div className="mt-8">
          {usingDemo && (
            <p className="mb-4 text-xs italic text-muted-foreground">
              Showing sample spots in Richmond Hill — real listings will appear here once businesses near you are open.
            </p>
          )}
          <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {display.map((biz, i) => {
            const closingSoon =
              biz.status.minutesUntilClose !== undefined &&
              biz.status.minutesUntilClose <= 60;
            return (
              <motion.div
                key={biz.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: Math.min(i * 0.05, 0.4) }}
              >
                <Link href={`/profile/${biz.id}`} className="group block">
                  <div className="relative aspect-square overflow-hidden rounded-xl bg-muted">
                    {biz.imageUrl ? (
                      <img
                        src={biz.imageUrl}
                        alt={biz.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="grid h-full w-full place-items-center text-muted-foreground">
                        <MapPin size={28} />
                      </div>
                    )}
                    <span
                      className={`absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        closingSoon
                          ? "bg-amber-500 text-black"
                          : "bg-emerald-500 text-black"
                      }`}
                    >
                      <Clock size={11} />
                      {closingSoon
                        ? `Closes ${formatTime12h(biz.status.closesAt)}`
                        : "Open now"}
                    </span>
                  </div>
                  <div className="mt-3 truncate text-sm font-semibold">{biz.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{formatDistance(biz.distanceKm)} away</span>
                    {biz.status.closesAt && !closingSoon && (
                      <>
                        <span aria-hidden>·</span>
                        <span>til {formatTime12h(biz.status.closesAt)}</span>
                      </>
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
          </div>
        </div>
        );
      })()}
    </section>
  );
}
