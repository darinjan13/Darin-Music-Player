import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";

export const useMusicPlayer = (getTrackCrossfade) => {
  const [playQueue, setPlayQueue] = useState([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(
    Number(localStorage.getItem("player_volume")) || 0.75
  );
  const [repeatMode, setRepeatMode] = useState("none");
  const [isShuffle, setIsShuffle] = useState(false);
  const [duration, setDuration] = useState(0);

  // 🔥 NEW SETTINGS
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(
    localStorage.getItem("crossfade_enabled") === "true"
  );
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(
    Number(localStorage.getItem("crossfade_seconds")) || 5
  );


  const audioRef = useRef(null);
  const audioNextRef = useRef(null);
  const isCrossfadingRef = useRef(false);

  const currentTimeRef = useRef(0);
  const rafRef = useRef(null);

  // --------------------------------
  // Current Track
  // --------------------------------
  const currentTrack = useMemo(() => {
    if (
      currentTrackIndex === null ||
      !playQueue[currentTrackIndex]
    ) {
      return null;
    }

    const track = playQueue[currentTrackIndex];
    return {
      ...track,
      url: convertFileSrc(track.path),
    };
  }, [currentTrackIndex, playQueue]);

  // --------------------------------
  // Volume sync
  // --------------------------------
  useEffect(() => {
    audioRef.current.volume = volume;
    localStorage.setItem("player_volume", volume);
  }, [volume]);

  useEffect(() => {
    localStorage.setItem("crossfade_enabled", crossfadeEnabled);
  }, [crossfadeEnabled]);

  useEffect(() => {
    localStorage.setItem("crossfade_seconds", crossfadeSeconds);
  }, [crossfadeSeconds]);

  // --------------------------------
  // Load track normally
  // --------------------------------
  useEffect(() => {
    if (!currentTrack) return;
    if (isCrossfadingRef.current) return;

    const audio = audioRef.current;

    if (!audio.src || !audio.src.includes(currentTrack.url)) {
      audio.src = currentTrack.url;
      audio.currentTime = 0;
    }

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [currentTrack]);

  // --------------------------------
  // Progress Loop
  // --------------------------------
  const startProgressLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    const loop = () => {
      if (audioRef.current) {
        currentTimeRef.current = audioRef.current.currentTime || 0;
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  }, []);

  const stopProgressLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // --------------------------------
  // Play / Pause
  // --------------------------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!currentTrack) return;

    if (isPlaying) {
      audio.play().then(startProgressLoop).catch(() => setIsPlaying(false));
    } else {
      audio.pause();
      stopProgressLoop();
    }
  }, [isPlaying, currentTrack]);

  // --------------------------------
  // Metadata
  // --------------------------------
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateMetadata = () => {
      setDuration(audio.duration || 0);
    };

    audio.addEventListener("loadedmetadata", updateMetadata);
    audio.addEventListener("durationchange", updateMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", updateMetadata);
      audio.removeEventListener("durationchange", updateMetadata);
    };
  }, [currentTrackIndex]);


  // --------------------------------
  // 🔥 CROSSFADE MONITOR
  // --------------------------------
  useEffect(() => {
    if (!crossfadeEnabled) return;
    if (!isPlaying) return;
    if (!currentTrack) return;

    const checkCrossfade = () => {
      const audio = audioRef.current;
      if (!audio.duration) return;
      if (isCrossfadingRef.current) return; // Already crossfading

      const timeLeft = audio.duration - audio.currentTime;

      // Get track-specific crossfade or use global default
      const activeCrossfade = getTrackCrossfade?.(currentTrack.path) ?? crossfadeSeconds;

      // Start crossfade with +5 second buffer to ensure smooth fade
      if (
        timeLeft <= activeCrossfade + 5 &&
        !isCrossfadingRef.current
      ) {
        startCrossfade();
      }
    };

    const interval = setInterval(checkCrossfade, 100); // Check more frequently
    return () => clearInterval(interval);
  }, [crossfadeEnabled, isPlaying, currentTrack, crossfadeSeconds, getTrackCrossfade]);

  // --------------------------------
  // 🔥 CROSSFADE LOGIC
  // --------------------------------
  const startCrossfade = () => {
    if (!playQueue.length) return;

    isCrossfadingRef.current = true;

    const nextIndex =
      currentTrackIndex === playQueue.length - 1
        ? 0
        : currentTrackIndex + 1;

    const nextTrack = playQueue[nextIndex];
    if (!nextTrack) return;

    const nextUrl = convertFileSrc(nextTrack.path);

    const currentAudio = audioRef.current;
    const nextAudio = audioNextRef.current;

    nextAudio.src = nextUrl;
    nextAudio.currentTime = 0;
    nextAudio.volume = 0;

    // Preload metadata to reduce switching delay
    nextAudio.load();

    nextAudio.play().catch(() => { });

    // Use track-specific crossfade or global default
    const activeCrossfade = getTrackCrossfade?.(currentTrack.path) ?? crossfadeSeconds;
    const fadeDuration = activeCrossfade * 1000;
    const startTime = performance.now();

    const fade = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / fadeDuration, 1);

      const currentVol = volume * (1 - progress);
      const nextVol = volume * progress;

      currentAudio.volume = Math.min(Math.max(currentVol, 0), 1);
      nextAudio.volume = Math.min(Math.max(nextVol, 0), 1);
      
      if (progress < 1) {
        requestAnimationFrame(fade);
      } else {
        // Fade complete - switch seamlessly
        currentAudio.pause();
        currentAudio.volume = 0;

        // Switch main audio to next track
        currentAudio.src = nextUrl;

        // Wait for metadata before syncing
        currentAudio.addEventListener(
          "loadedmetadata",
          () => {
            // Get the CURRENT time from helper (not stale)
            const syncTime = nextAudio.currentTime;
            currentAudio.currentTime = syncTime;
            currentAudio.volume = volume;
            setDuration(currentAudio.duration || 0);
            
            // Resume playback seamlessly
            currentAudio.play().then(() => {
              // Only stop helper AFTER main audio is confirmed playing
              setTimeout(() => {
                nextAudio.pause();
                nextAudio.removeAttribute("src");
                nextAudio.load();
              }, 50);
            }).catch(err => {
              console.error("Play error during crossfade:", err);
              setIsPlaying(false);
              // Still clean up helper on error
              nextAudio.pause();
              nextAudio.removeAttribute("src");
              nextAudio.load();
            });
          },
          { once: true }
        );

        setCurrentTrackIndex(nextIndex);

        isCrossfadingRef.current = false;

      }
    };

    requestAnimationFrame(fade);
  };


  // -------------------------------
  // Play next (queue reorder)
  // -------------------------------
  const handlePlayNext = useCallback((track) => {
    setPlayQueue((prev) => {
      const idx = prev.findIndex((t) => t.path === track.path);
      if (idx === -1) return prev;

      const updated = [...prev];
      const [moved] = updated.splice(idx, 1);

      updated.splice(currentTrackIndex + 1, 0, moved);
      return updated;
    });
  }, [currentTrackIndex]);

  // --------------------------------
  // Next / Prev (unchanged)
  // --------------------------------
  const handleNext = useCallback(() => {
    if (playQueue.length === 0) return;

    setCurrentTrackIndex(prev =>
      prev === playQueue.length - 1 ? 0 : prev + 1
    );

    setIsPlaying(true);
  }, [playQueue]);

  const handlePrev = useCallback(() => {
    if (playQueue.length === 0) return;

    setCurrentTrackIndex(prev =>
      prev === 0 ? playQueue.length - 1 : prev - 1
    );
  }, [playQueue]);

  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.file.name.replace(/\.[^/.]+$/, ""),
      artist: "Darin Music Player",
      album: "Local Collection",
    });

    navigator.mediaSession.setActionHandler("play", () =>
      setIsPlaying(true)
    );
    navigator.mediaSession.setActionHandler("pause", () =>
      setIsPlaying(false)
    );
    navigator.mediaSession.setActionHandler("nexttrack", handleNext);
    navigator.mediaSession.setActionHandler("previoustrack", handlePrev);
  }, [currentTrack, handleNext, handlePrev]);

  // --------------------------------
  return {
    audioRef,
    currentTrack,
    playQueue,
    setPlayQueue,
    currentTrackIndex,
    setCurrentTrackIndex,
    isPlaying,
    setIsPlaying,
    volume,
    setVolume,
    repeatMode,
    setRepeatMode,
    isShuffle,
    setIsShuffle,
    handleNext,
    handlePrev,
    duration,
    currentTimeRef,
    handlePlayNext,
    setDuration,
    audioNextRef,
    // 🔥 New
    crossfadeEnabled,
    setCrossfadeEnabled,
    crossfadeSeconds,
    setCrossfadeSeconds
  };
};