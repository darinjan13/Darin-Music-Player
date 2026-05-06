import React, { useState, useRef, useEffect, memo } from "react";
import { MusicNoteIcon, OptionsIcon } from "./Icons.jsx";

/* ================= OPTIONS MENU ================= */

const OptionsMenu = memo(
  ({
    track,
    playlists,
    onAddToPlaylist,
    isPlaylistView,
    isQueueView,
    onPlayNext,
    onRemoveFromPlaylist,
    onRename,
    onDelete,
    onSetCrossfade,
    index,
    currentTrack,
    trackCrossfade,
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
    const [openUpward, setOpenUpward] = useState(true);
    const menuRef = useRef(null);

    useEffect(() => {
      if (!isOpen) return;

      const handleClickOutside = (e) => {
        if (menuRef.current && !menuRef.current.contains(e.target)) {
          setIsOpen(false);
          setShowPlaylistSelector(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const toggleMenu = (e) => {
      e.stopPropagation();

      if (!isOpen && menuRef.current) {
        const rect = menuRef.current.getBoundingClientRect();
        setOpenUpward(rect.top > 250);
      }

      setIsOpen((v) => !v);
      setShowPlaylistSelector(false);
    };

    const isMainLibrary = !isPlaylistView && !isQueueView;
    const isAlreadyPlaying = track.path === currentTrack?.path;

    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={toggleMenu}
          className="p-2 hover:bg-white/10 rounded-full"
        >
          <OptionsIcon className="w-5 h-5 text-gray-400 hover:text-white" />
        </button>

        {isOpen && (
          <div
            className={`absolute right-0 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1
              ${openUpward ? "bottom-full mb-2" : "top-full mt-2"}`}
          >
            {isMainLibrary && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPlaylistSelector((v) => !v);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex justify-between"
                >
                  Add to Playlist
                  <span className={showPlaylistSelector ? "rotate-90" : ""}>
                    →
                  </span>
                </button>

                {showPlaylistSelector && (
                  <div className="bg-black/20 py-1 border-y border-white/5 max-h-40 overflow-y-auto">
                    {playlists?.map((pl) => (
                      <button
                        key={pl.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToPlaylist(pl.id, track);
                          setIsOpen(false);
                        }}
                        className="w-full px-6 py-2 text-left text-xs text-gray-400 hover:bg-indigo-500/20 hover:text-white"
                      >
                        {pl.name}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const current = trackCrossfade ?? '';
                    const input = prompt(
                      `Set crossfade duration for this track (in seconds):\n\nLeave empty to use global default.${current ? `\n\nCurrent: ${current}s` : ''}`,
                      current
                    );
                    
                    if (input === null) return; // Cancelled
                    
                    if (input === '' || input === undefined) {
                      // Remove custom setting
                      onSetCrossfade(track, null);
                    } else {
                      const seconds = parseFloat(input);
                      if (!isNaN(seconds) && seconds >= 0 && seconds <= 30) {
                        onSetCrossfade(track, seconds);
                      } else {
                        alert('Please enter a valid number between 0 and 30');
                      }
                    }
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10"
                >
                  <div className="flex justify-between items-center">
                    <span>Set Crossfade Duration</span>
                    {trackCrossfade !== undefined && (
                      <span className="text-xs text-indigo-400">{trackCrossfade}s</span>
                    )}
                  </div>
                </button>
              </>
            )}

            {isQueueView && index !== 0 && !isAlreadyPlaying && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onPlayNext(track);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10"
              >
                Move to Top (Play Next)
              </button>
            )}

            {isPlaylistView && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveFromPlaylist(track);
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10"
              >
                Remove from Playlist
              </button>
            )}

            {isMainLibrary && (
              <div className="border-t border-white/5 mt-1 pt-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRename(track);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-white/10"
                >
                  Rename File
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(track);
                    setIsOpen(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500/80 hover:bg-red-500/10"
                >
                  Delete from Disk
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }
);

/* ================= TRACK ITEM ================= */

const TrackItem = memo(
  ({
    track,
    index,
    isCurrent,
    isPlaying,
    onSelectTrack,
    playlists,
    onAddToPlaylist,
    isPlaylistView,
    isQueueView,
    onRemoveFromPlaylist,
    onPlayNext,
    onRename,
    onDelete,
    onSetCrossfade,
    currentTrack,
    trackCrossfade,
  }) => {
    const itemRef = useRef(null);

    useEffect(() => {
      if (isCurrent && itemRef.current) {
        itemRef.current.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      }
    }, [isCurrent]);

    return (
      <li
        ref={itemRef}
        onClick={() => onSelectTrack(track)}
        className={`group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition
          ${isCurrent ? "bg-indigo-600/20 ring-1 ring-indigo-500/30" : "hover:bg-white/5"}`}
      >
        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
          {isCurrent && isPlaying ? (
            <div className="flex gap-0.5 items-end h-4">
              <div className="w-1 bg-indigo-400 h-[60%]" />
              <div className="w-1 bg-indigo-400 h-full" />
              <div className="w-1 bg-indigo-400 h-[80%]" />
            </div>
          ) : (
            <MusicNoteIcon
              className={`w-5 h-5 ${
                isCurrent ? "text-indigo-400" : "text-gray-500"
              }`}
            />
          )}
        </div>

        <div className="flex-grow min-w-0">
          <p className="text-sm font-medium truncate">
            {track.file.name.replace(/\.[^/.]+$/, "")}
          </p>
          <p className="text-xs text-gray-500">
            {isCurrent ? "Now Playing" : "Local File"}
          </p>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <OptionsMenu
            track={track}
            index={index}
            currentTrack={currentTrack}
            playlists={playlists}
            onAddToPlaylist={onAddToPlaylist}
            isPlaylistView={isPlaylistView}
            isQueueView={isQueueView}
            onPlayNext={onPlayNext}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            onRename={onRename}
            onDelete={onDelete}
            onSetCrossfade={onSetCrossfade}
            trackCrossfade={trackCrossfade}
          />
        </div>
      </li>
    );
  }
);

/* ================= TRACK LIST ================= */

export const TrackList = memo(
  ({
    tracks,
    currentTrack,
    isPlaying,
    onSelectTrack,
    emptyMessage,
    playlists,
    onAddToPlaylist,
    isPlaylistView = false,
    isQueueView = false,
    onRemoveFromPlaylist,
    onPlayNext,
    onRename,
    onDelete,
    onSetCrossfade,
    getTrackCrossfade,
  }) => {
    if (tracks.length === 0) {
      return (
        <div className="text-center py-20 opacity-40">
          <p className="font-bold">{emptyMessage?.title || "No tracks found"}</p>
          <p className="text-sm">{emptyMessage?.subtitle || ""}</p>
        </div>
      );
    }

    return (
      <ul className="space-y-1 p-2">
        {tracks.map((track, index) => (
          <TrackItem
            key={track.path}
            track={track}
            index={index}
            isCurrent={currentTrack?.path === track.path}
            isPlaying={isPlaying}
            onSelectTrack={onSelectTrack}
            playlists={playlists}
            onAddToPlaylist={onAddToPlaylist}
            isPlaylistView={isPlaylistView}
            isQueueView={isQueueView}
            onRemoveFromPlaylist={onRemoveFromPlaylist}
            onPlayNext={onPlayNext}
            onRename={onRename}
            onDelete={onDelete}
            onSetCrossfade={onSetCrossfade}
            currentTrack={currentTrack}
            trackCrossfade={getTrackCrossfade?.(track.path)}
          />
        ))}
      </ul>
    );
  }
);
