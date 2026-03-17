"use client";

// This component MUST be dynamically imported with ssr: false:
// const MidpointMap = dynamic(() => import('@/components/hangout/midpoint-map'), { ssr: false })

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface Pin {
    lat: number;
    lng: number;
    name: string;
    avatarUrl?: string | null;
}

interface MidpointMapProps {
    pins: Pin[];
    midpoint: { lat: number; lng: number } | null;
    className?: string;
}

export default function MidpointMap({ pins, midpoint, className }: MidpointMapProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<import("leaflet").Map | null>(null);

    useEffect(() => {
        if (!containerRef.current) return;

        // Dynamically import leaflet to avoid SSR issues
        import("leaflet").then((L) => {
            // Fix broken default icon paths in Next.js
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
                iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
                shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
            });

            // Avoid double-initializing the map
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }

            const map = L.map(containerRef.current!).setView([39.5, -98.35], 4);
            mapRef.current = map;

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution:
                    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
                maxZoom: 19,
            }).addTo(map);

            const bounds: [number, number][] = [];

            // Participant pins — blue circle markers
            const participantIcon = L.divIcon({
                className: "",
                html: `<div style="
                    width: 28px;
                    height: 28px;
                    background: #3b82f6;
                    border: 3px solid #fff;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.4);
                "></div>`,
                iconSize: [28, 28],
                iconAnchor: [14, 14],
            });

            pins.forEach((pin) => {
                L.marker([pin.lat, pin.lng], { icon: participantIcon })
                    .addTo(map)
                    .bindPopup(
                        `<div style="font-family:sans-serif;font-size:13px;font-weight:600;color:#1e293b">${pin.name}</div>`
                    );
                bounds.push([pin.lat, pin.lng]);
            });

            // Midpoint marker — lime green star
            if (midpoint) {
                const midpointIcon = L.divIcon({
                    className: "",
                    html: `<div style="
                        width: 36px;
                        height: 36px;
                        background: #84cc16;
                        border: 3px solid #fff;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        box-shadow: 0 2px 12px rgba(132,204,22,0.5);
                    ">★</div>`,
                    iconSize: [36, 36],
                    iconAnchor: [18, 18],
                });

                L.marker([midpoint.lat, midpoint.lng], { icon: midpointIcon })
                    .addTo(map)
                    .bindPopup(
                        `<div style="font-family:sans-serif;font-size:13px;font-weight:700;color:#3f6212">Midpoint</div>`
                    );
                bounds.push([midpoint.lat, midpoint.lng]);
            }

            // Fit map to show all markers
            if (bounds.length > 0) {
                if (bounds.length === 1) {
                    map.setView(bounds[0], 13);
                } else {
                    map.fitBounds(bounds, { padding: [40, 40] });
                }
            }
        });

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
        // Re-render when pins or midpoint change
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(pins), JSON.stringify(midpoint)]);

    if (pins.length === 0 && !midpoint) {
        return (
            <div
                className={className}
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "#18212f",
                    borderRadius: "12px",
                    border: "1px dashed rgba(255,255,255,0.1)",
                }}
            >
                <p style={{ color: "#94a3b8", fontSize: "14px", textAlign: "center", padding: "24px" }}>
                    Drop your location to find a fair meetup spot
                </p>
            </div>
        );
    }

    return <div ref={containerRef} className={className} style={{ borderRadius: "12px", overflow: "hidden" }} />;
}
