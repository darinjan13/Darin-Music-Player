import { useState, useEffect, useRef, useCallback } from "react";
import { LazyStore } from "@tauri-apps/plugin-store";

export const useTrackSettings = () => {
  const storeRef = useRef(null);
  const [trackSettings, setTrackSettings] = useState({});

  // Initialize store once
  if (!storeRef.current) {
    storeRef.current = new LazyStore("track-settings.json");
  }

  // Load settings from disk
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const saved = await storeRef.current.get("trackSettings");
        if (mounted && saved && typeof saved === "object") {
          setTrackSettings(saved);
        }
      } catch (err) {
        console.error("Failed to load track settings:", err);
        setTrackSettings({});
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveToDisk = useCallback(async (updater) => {
    setTrackSettings((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;

      // Persist async
      (async () => {
        try {
          await storeRef.current.set("trackSettings", next);
          await storeRef.current.save();
        } catch (err) {
          console.error("Failed to save track settings:", err);
        }
      })();

      return next;
    });
  }, []);

  const setTrackCrossfade = useCallback((trackPath, seconds) => {
    saveToDisk((prev) => ({
      ...prev,
      [trackPath]: {
        ...prev[trackPath],
        crossfadeSeconds: seconds,
      },
    }));
  }, [saveToDisk]);

  const removeTrackCrossfade = useCallback((trackPath) => {
    saveToDisk((prev) => {
      const next = { ...prev };
      if (next[trackPath]) {
        delete next[trackPath].crossfadeSeconds;
        // If no other settings, remove the track entry entirely
        if (Object.keys(next[trackPath]).length === 0) {
          delete next[trackPath];
        }
      }
      return next;
    });
  }, [saveToDisk]);

  const getTrackCrossfade = useCallback((trackPath) => {
    return trackSettings[trackPath]?.crossfadeSeconds;
  }, [trackSettings]);

  return {
    trackSettings,
    setTrackCrossfade,
    removeTrackCrossfade,
    getTrackCrossfade,
  };
};