import { useState, useEffect, useRef } from "react";
import AudioVisualizer from "./AudioVisualizer";
import { PlayerControls } from "./PlayerControls";
import { TrackList } from "./Playlist";
import { PlayIcon, PauseIcon, PrevIcon, NextIcon } from "./Icons";

const ChevronDownIcon = ({ className = "w-6 h-6" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      d="M19 9l-7 7-7-7"
    />
  </svg>
);

export const PlayerSheet = ({
  track,
  playQueue,
  analyser,
  isPlaying,
  onPlayPause,
  funnyPic,
  onPlayNext,
  currentTimeRef,
  duration,
  onSeek,
  onSelectFromQueue,
  onRemoveFromQueue,
  onMoveToNext,
  onSetCrossfade,
  getTrackCrossfade,
  ...playerControlsProps
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const progressBarRef = useRef(null);

  useEffect(() => {
    if (!track || !duration) return;

    let raf;
    const update = () => {
      if (progressBarRef.current) {
        const percent = Math.min(
          100,
          Math.max(0, (currentTimeRef.current / duration) * 100)
        );
        progressBarRef.current.style.width = `${percent}%`;
      }
      raf = requestAnimationFrame(update);
    };

    update();
    return () => cancelAnimationFrame(raf);
  }, [track, duration, currentTimeRef]);

  if (!track) return null;

  return (
    <div
      className={`
        fixed bottom-0 left-0 right-0 z-30
        bg-gray-800/80 backdrop-blur-md
        transition-all duration-500 ease-in-out
        ${isExpanded ? "top-0" : "top-[calc(100vh-4rem)]"}
      `}
    >
      <div className="relative w-full h-full flex flex-col">

        {/* MINIMIZED BAR */}
        <div
          onClick={() => !isExpanded && setIsExpanded(true)}
          className={`
            absolute top-0 left-0 right-0 h-16 z-20
            ${isExpanded ? "opacity-0 pointer-events-none" : "opacity-100 cursor-pointer"}
          `}
        >
          <div
            ref={progressBarRef}
            className="absolute top-0 left-0 h-1 bg-indigo-500"
            style={{ width: "0%" }}
          />

          <div className="grid grid-cols-3 items-center h-full px-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-gray-700 rounded-md overflow-hidden">
                {funnyPic ? (
                  <img src={funnyPic} className="w-full h-full object-cover" />
                ) : (
                  <PlayIcon className="w-5 h-5 text-gray-400" />
                )}
              </div>
              <p className="font-semibold text-white truncate text-sm">
                {track.file.name.replace(/\.[^/.]+$/, "")}
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playerControlsProps.onPrev();
                }}
              >
                <PrevIcon className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayPause();
                }}
                className="bg-white text-gray-900 rounded-full p-2"
              >
                {isPlaying ? (
                  <PauseIcon className="w-5 h-5" />
                ) : (
                  <PlayIcon className="w-5 h-5" />
                )}
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  playerControlsProps.onNext();
                }}
              >
                <NextIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* EXPANDED VIEW */}
        <div
          className={`
            w-full h-full flex flex-col
            ${isExpanded ? "opacity-100" : "opacity-0 pointer-events-none"}
          `}
          style={{
            backgroundImage: `url(${funnyPic})`,
            filter: "brightness(0.5) saturate(1.4)",
          }}
        >
          <div className="p-4">
            <button onClick={() => setIsExpanded(false)}>
              <ChevronDownIcon className="w-8 h-8 text-gray-400" />
            </button>
          </div>

          <div className="flex-grow flex flex-col lg:flex-row p-6 gap-8 overflow-hidden">

            <div className="relative w-full lg:w-2/3">
              <AudioVisualizer
                funnyPic={funnyPic}
                analyser={analyser}
                isPlaying={isPlaying}
              />
            </div>

            <div className="w-full lg:w-1/3 flex flex-col bg-gray-900/50 rounded-3xl p-6 overflow-hidden">
              <h3 className="text-xl font-bold mb-4">
                Up Next
                <span className="ml-2 text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">
                  {playQueue.length}
                </span>
              </h3>

              <div className="flex-grow overflow-y-auto">
                <TrackList
                  tracks={playQueue}
                  currentTrack={track}
                  onSelectTrack={onSelectFromQueue}
                  onRemoveFromQueue={onRemoveFromQueue}
                  onMoveToNext={onMoveToNext}
                  onPlayNext={onPlayNext}
                  onSetCrossfade={onSetCrossfade}
                  getTrackCrossfade={getTrackCrossfade}
                  isQueueView
                />
              </div>
            </div>
          </div>

          <div className="bg-black/40 backdrop-blur-xl border-t border-white/5 p-2">
            <PlayerControls
              {...playerControlsProps}
              isPlaying={isPlaying}
              onPlayPause={onPlayPause}
              disabled={!track}
              currentTrack={track.file}
              currentTimeRef={currentTimeRef}
              duration={duration}
              onSeek={onSeek}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
