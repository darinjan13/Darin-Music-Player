import React, { useEffect, useRef } from "react";
import {
  PlayIcon,
  PauseIcon,
  NextIcon,
  PrevIcon,
  ShuffleIcon,
  RepeatIcon,
  RepeatOneIcon,
  VolumeMuteIcon,
  VolumeMediumIcon,
  VolumeHighIcon,
} from "./Icons.jsx";

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

const getRangeBg = (percent) => {
  const p = clamp(percent, 0, 100);
  return `linear-gradient(
    to right,
    rgba(129,140,248,1) 0%,
    rgba(129,140,248,1) ${p}%,
    rgba(75,85,99,1) ${p}%,
    rgba(75,85,99,1) 100%
  )`;
};

export const PlayerControls = ({
  isPlaying,
  onPlayPause,
  onNext,
  onPrev,
  currentTimeRef,
  duration,
  onSeek,
  volume,
  onVolumeChange,
  disabled,
  isShuffle,
  onToggleShuffle,
  repeatMode,
  onToggleRepeat,
  currentTrack,
}) => {
  const progressBarRef = useRef(null);

  // 🔥 RAF-based progress update (NO React state)
  useEffect(() => {
    if (!duration) return;

    let raf;

    const update = () => {
      if (progressBarRef.current) {
        const percent = clamp(
          (currentTimeRef.current / duration) * 100,
          0,
          100
        );
        progressBarRef.current.style.width = `${percent}%`;
      }
      raf = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(raf);
  }, [duration, currentTimeRef]);

  const RepeatButtonIcon = () => {
    if (repeatMode === "one")
      return <RepeatOneIcon className="w-5 h-5 text-indigo-400" />;

    return (
      <RepeatIcon
        className={`w-5 h-5 ${
          repeatMode === "all"
            ? "text-indigo-400"
            : "text-gray-400 group-hover:text-white"
        }`}
      />
    );
  };

  const VolumeIcon = () => {
    if (volume === 0) return <VolumeMuteIcon className="w-5 h-5" />;
    if (volume < 0.5) return <VolumeMediumIcon className="w-5 h-5" />;
    return <VolumeHighIcon className="w-5 h-5" />;
  };

  const miniBtn =
    "grid place-items-center w-10 h-10 rounded-full transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed";

  const transportBtn =
    "grid place-items-center w-10 h-10 rounded-full text-gray-300 hover:text-white hover:bg-white/10 transition active:scale-[0.98] disabled:opacity-40";

  const playBtn =
    "grid place-items-center w-14 h-14 rounded-full bg-white text-gray-900 shadow-xl transition hover:scale-[1.05] active:scale-[0.95] disabled:bg-gray-700 disabled:text-gray-400";

  return (
    <div className="px-3">
      <div className="rounded-2xl border border-white/10 bg-gray-900/60 backdrop-blur-md shadow-2xl relative">
        {/* Progress bar */}
        <div
          className="absolute top-0 left-0 w-full h-1 cursor-pointer overflow-hidden rounded-t-2xl"
          onClick={(e) => {
            if (!duration) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const percent = (e.clientX - rect.left) / rect.width;
            onSeek(percent * duration);
          }}
        >
          <div
            ref={progressBarRef}
            className="h-full bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]"
            style={{ width: "0%" }}
          />
        </div>

        <div className="px-6 pt-5 pb-3 grid grid-cols-3 items-center">
          <div className="flex flex-col justify-center overflow-hidden">
            <span className="text-sm font-bold text-white truncate">
              {currentTrack?.name
                ? currentTrack.name.replace(/\.[^/.]+$/, "")
                : "No track selected"}
            </span>
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest mt-0.5">
              Local Experience
            </span>
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={onToggleShuffle}
              disabled={disabled}
              className={`${miniBtn} ${
                isShuffle
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <ShuffleIcon className="w-5 h-5" />
            </button>

            <button onClick={onPrev} disabled={disabled} className={transportBtn}>
              <PrevIcon className="w-6 h-6" />
            </button>

            <button
              onClick={onPlayPause}
              disabled={disabled}
              className={playBtn}
            >
              {isPlaying ? (
                <PauseIcon className="w-7 h-7" />
              ) : (
                <PlayIcon className="w-7 h-7" />
              )}
            </button>

            <button onClick={onNext} disabled={disabled} className={transportBtn}>
              <NextIcon className="w-6 h-6" />
            </button>

            <button
              onClick={onToggleRepeat}
              disabled={disabled}
              className={`${miniBtn} ${
                repeatMode !== "none"
                  ? "bg-indigo-500/20 text-indigo-400"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <RepeatButtonIcon />
            </button>
          </div>

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => onVolumeChange(volume > 0 ? 0 : 0.8)}
              disabled={disabled}
              className="grid place-items-center w-9 h-9 rounded-full text-gray-400 hover:text-white"
            >
              <VolumeIcon />
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={volume}
              onChange={(e) => onVolumeChange(Number(e.target.value))}
              className="range-yt w-24"
              style={{ background: getRangeBg(volume * 100) }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
