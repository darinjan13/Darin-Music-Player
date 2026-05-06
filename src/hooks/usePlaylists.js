import { useState, useEffect, useRef, useCallback } from "react";
import { LazyStore } from "@tauri-apps/plugin-store";

export const usePlaylists = () => {
  const storeRef = useRef(null);
  const [playlists, setPlaylists] = useState([]);

  // Initialize store once
  if (!storeRef.current) {
    storeRef.current = new LazyStore("playlists.json");
  }

  // Load playlists from disk
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const saved = await storeRef.current.get("playlists");
        if (mounted && Array.isArray(saved)) {
          setPlaylists(saved);
        }
      } catch (err) {
        console.error("Failed to load playlists:", err);
        setPlaylists([]);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const saveToDisk = useCallback(async (updater) => {
    setPlaylists((prev) => {
      const next =
        typeof updater === "function" ? updater(prev) : updater;

      // Persist async but based on the SAME data
      (async () => {
        try {
          await storeRef.current.set("playlists", next);
          await storeRef.current.save();
        } catch (err) {
          console.error("Failed to save playlists:", err);
        }
      })();

      return next;
    });
  }, []);

  const createPlaylist = useCallback((name) => {
    saveToDisk((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name, tracks: [] },
    ]);
  }, [saveToDisk]);

  const deletePlaylist = useCallback((id) => {
    saveToDisk((prev) => prev.filter((p) => p.id !== id));
  }, [saveToDisk]);

  const handleAddToPlaylist = useCallback((playlistId, track) => {
    saveToDisk((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        if (pl.tracks.some((t) => t.path === track.path)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      })
    );
  }, [saveToDisk]);

  const handleRemoveFromPlaylist = useCallback((playlistId, track) => {
    saveToDisk((prev) =>
      prev.map((pl) => {
        if (pl.id !== playlistId) return pl;
        return {
          ...pl,
          tracks: pl.tracks.filter((t) => t.path !== track.path),
        };
      })
    );
  }, [saveToDisk]);

  return {
    playlists,
    createPlaylist,
    deletePlaylist,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
  };
};
