import React, { useState, useRef, useEffect, memo, useCallback } from 'react';
import { MusicNoteIcon, OptionsIcon, PlayIcon } from './Icons.jsx';

// 1. MEMOIZED OPTIONS MENU
// This prevents the menu logic from recalculating unless the track itself changes
const OptionsMenu = memo(({
    track,
    playlists,
    onAddToPlaylist,
    isPlaylistView,
    isQueueView,
    onPlayNext,
    onRemoveFromPlaylist,
    onRename,
    onDelete,
    currentIndexInQueue,
    currentTrack // Used to prevent "Play Next" on the currently playing song
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [showPlaylistSelector, setShowPlaylistSelector] = useState(false);
    const [openUpward, setOpenUpward] = useState(true);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setIsOpen(false);
                setShowPlaylistSelector(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleMenu = (e) => {
        e.stopPropagation();
        
        if (!isOpen) {
            // Smart Position Calculation
            const rect = menuRef.current.getBoundingClientRect();
            const spaceAbove = rect.top;
            const menuHeight = 250; 
            
            // If there's no room above, flip it to open downward
            setOpenUpward(spaceAbove > menuHeight);
        }
        
        setIsOpen(!isOpen);
        setShowPlaylistSelector(false);
    };

    const isMainLibrary = !isPlaylistView && !isQueueView;
    const isAlreadyPlaying = track.path === currentTrack?.path;

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
            >
                <OptionsIcon className="w-5 h-5 text-gray-400 group-hover:text-white" />
            </button>

            {isOpen && (
                <div 
                    className={`absolute right-0 w-56 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 py-1 backdrop-blur-xl transition-all
                        ${openUpward ? 'bottom-full mb-2' : 'top-full mt-2'}`}
                >
                    {/* 1. MAIN LIBRARY ONLY: Add to Playlist */}
                    {isMainLibrary && (
                        <>
                            <button
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    setShowPlaylistSelector(!showPlaylistSelector); 
                                }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-white/10 flex justify-between items-center"
                            >
                                Add to Playlist
                                <span className={showPlaylistSelector ? "rotate-90 transition-transform" : "transition-transform"}>→</span>
                            </button>

                            {showPlaylistSelector && (
                                <div className="bg-black/20 py-1 border-y border-white/5 max-h-40 overflow-y-auto custom-scrollbar">
                                    {playlists?.map(pl => (
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
                        </>
                    )}

                    {/* 2. QUEUE ONLY: Play Next (Hidden if top or already playing) */}
                    {isQueueView && currentIndexInQueue !== 0 && !isAlreadyPlaying && (
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

                    {/* 3. PLAYLIST ONLY: Remove */}
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

                    {/* 4. MAIN LIBRARY ONLY: File Operations */}
                    {isMainLibrary && (
                        <div className="border-t border-white/5 mt-1 pt-1">
                            <button
                                onClick={(e) => { e.stopPropagation(); onRename(track); setIsOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-gray-400 hover:bg-white/10"
                            >
                                Rename File
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onDelete(track); setIsOpen(false); }}
                                className="w-full px-4 py-2.5 text-left text-sm text-red-500/80 hover:bg-red-500/10"
                            >
                                Delete from Disk
                            </button>
                        </div>
                    )}

                    {/* FALLBACK: If nothing to show */}
                    {((isQueueView && (currentIndexInQueue === 0 || isAlreadyPlaying)) && !isMainLibrary && !isPlaylistView) && (
                        <div className="px-4 py-2.5 text-[10px] text-gray-500 italic text-center">
                            No actions available for active track
                        </div>
                    )}
                </div>
            )}
        </div>
    );
});

// 2. MEMOIZED TRACK ITEM
// This is the most important part for the 600MB fix. 
// It ensures that only the song currently playing updates.
const TrackItem = memo(({ 
    track, isCurrent, isPlaying, onSelectTrack, playlists, 
    onAddToPlaylist, isPlaylistView, isQueueView, onRemoveFromPlaylist, onPlayNext, onRename, onDelete
}) => {
    // 1. Create a reference for this specific list item
    const itemRef = useRef(null);

    // 2. Add the scroll logic
    useEffect(() => {
        if (isCurrent && itemRef.current) {
            itemRef.current.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest', // 'nearest' prevents the whole page from jumping
            });
        }
    }, [isCurrent]); // Trigger whenever this track becomes the active one

    return (
        <li 
            ref={itemRef} // 3. Attach the ref here
            onClick={() => onSelectTrack(track)}
            className={`group flex items-center gap-3 p-2 rounded-xl cursor-pointer transition-all duration-200 ${
                isCurrent ? 'bg-indigo-600/20 ring-1 ring-indigo-500/30' : 'hover:bg-white/5'
            }`}
        >
            <div className="relative w-10 h-10 flex-shrink-0 bg-gray-800 rounded-lg overflow-hidden flex items-center justify-center">
                {isCurrent && isPlaying ? (
                    <div className="flex gap-0.5 items-end h-4">
                        <div className="w-1 bg-indigo-400 animate-[bounce_1s_infinite_0.1s]" style={{height: '60%'}}></div>
                        <div className="w-1 bg-indigo-400 animate-[bounce_1s_infinite_0.3s]" style={{height: '100%'}}></div>
                        <div className="w-1 bg-indigo-400 animate-[bounce_1s_infinite_0.5s]" style={{height: '80%'}}></div>
                    </div>
                ) : (
                    <MusicNoteIcon className={`w-5 h-5 ${isCurrent ? 'text-indigo-400' : 'text-gray-500'}`} />
                )}
            </div>

            <div className="flex-grow min-w-0">
                <p className={`text-sm font-medium truncate ${isCurrent ? 'text-indigo-400' : 'text-gray-200'}`}>
                    {track.file.name.replace(/\.[^/.]+$/, "")}
                </p>
                <p className="text-xs text-gray-500 truncate">
                    {isCurrent ? 'Now Playing' : 'Local File'}
                </p>
            </div>

            <div onClick={(e) => e.stopPropagation()}>
                <OptionsMenu
                    track={track}
                    playlists={playlists}
                    onAddToPlaylist={onAddToPlaylist}
                    isPlaylistView={isPlaylistView}
                    isQueueView={isQueueView}
                    onPlayNext={onPlayNext}
                    onRemoveFromPlaylist={onRemoveFromPlaylist}
                    onRename={onRename}
                    onDelete={onDelete}
                />
            </div>
        </li>
    );
});

// 3. MEMOIZED TRACK LIST
// This prevents the entire UL from re-rendering just because the "Current Time" 
// of the song is updating in the parent component.
export const TrackList = memo(({ 
    tracks, currentTrack, isPlaying, onSelectTrack, emptyMessage, 
    playlists, onAddToPlaylist, isPlaylistView = false, 
    isQueueView = false, 
    onRemoveFromPlaylist, onPlayNext, onRename, onDelete
}) => {
    
    if (tracks.length === 0) return (
        <div className="text-center py-20 px-10 border border-dashed border-white/10 rounded-[2rem] bg-white/[0.02]">
            <p className="text-lg font-bold text-gray-400">{emptyMessage?.title || "No tracks found"}</p>
            <p className="text-sm text-gray-500 mt-1">{emptyMessage?.subtitle || ""}</p>
        </div>
    );

    return (
        <ul className="space-y-1 p-2">
            {tracks.map((track) => (
                <TrackItem
                    key={track.path}
                    track={track}
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
                />
            ))}
        </ul>
    );
});