"use client";

import { useState, useEffect, useCallback } from "react";

interface LocationState {
    latitude: number | null;
    longitude: number | null;
    error: string | null;
    loading: boolean;
    permissionStatus: "prompt" | "granted" | "denied" | "unknown";
}

const DEFAULT_LOCATION = {
    latitude: 37.7749, // San Francisco fallback
    longitude: -122.4194,
};

export function useLocation() {
    const [state, setState] = useState<LocationState>({
        latitude: null,
        longitude: null,
        error: null,
        loading: true,
        permissionStatus: "unknown",
    });

    const requestLocation = useCallback(() => {
        if (!navigator.geolocation) {
            setState(prev => ({
                ...prev,
                error: "Geolocation not supported",
                loading: false,
                latitude: DEFAULT_LOCATION.latitude,
                longitude: DEFAULT_LOCATION.longitude,
            }));
            return;
        }

        setState(prev => ({ ...prev, loading: true }));

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setState({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    error: null,
                    loading: false,
                    permissionStatus: "granted",
                });
            },
            (error) => {
                let errorMessage = "Unknown error";
                let status: LocationState["permissionStatus"] = "unknown";

                switch (error.code) {
                    case error.PERMISSION_DENIED:
                        errorMessage = "Location permission denied";
                        status = "denied";
                        break;
                    case error.POSITION_UNAVAILABLE:
                        errorMessage = "Location unavailable";
                        break;
                    case error.TIMEOUT:
                        errorMessage = "Location request timed out";
                        break;
                }

                setState({
                    latitude: DEFAULT_LOCATION.latitude,
                    longitude: DEFAULT_LOCATION.longitude,
                    error: errorMessage,
                    loading: false,
                    permissionStatus: status,
                });
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000, // 5 minutes cache
            }
        );
    }, []);

    // Check permission status on mount
    useEffect(() => {
        if ("permissions" in navigator) {
            navigator.permissions
                .query({ name: "geolocation" })
                .then((result) => {
                    setState(prev => ({
                        ...prev,
                        permissionStatus: result.state as LocationState["permissionStatus"],
                    }));

                    // Auto-request if already granted
                    if (result.state === "granted") {
                        requestLocation();
                    } else {
                        setState(prev => ({ ...prev, loading: false }));
                    }

                    // Listen for changes
                    result.onchange = () => {
                        setState(prev => ({
                            ...prev,
                            permissionStatus: result.state as LocationState["permissionStatus"],
                        }));
                    };
                })
                .catch(() => {
                    setState(prev => ({ ...prev, loading: false }));
                });
        } else {
            // Fallback: just try to get location
            requestLocation();
        }
    }, [requestLocation]);

    return {
        ...state,
        requestLocation,
        // Convenience getter with fallback
        coords: {
            lat: state.latitude ?? DEFAULT_LOCATION.latitude,
            lng: state.longitude ?? DEFAULT_LOCATION.longitude,
        },
    };
}
