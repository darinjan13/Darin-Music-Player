import { useState } from 'react';
import AudioVisualizer from './AudioVisualizer';
import { PlayerControls } from './PlayerControls';
import { TrackList } from './Playlist';
import { PlayIcon, PauseIcon, PrevIcon, NextIcon } from './Icons';

const ChevronDownIcon = ({ className = "w-6 h-6" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
    </svg>
);

export const PlayerSheet = ({
    track,
    playQueue,
    onSelectFromQueue,
    onRemoveFromQueue,
    onMoveToNext,
    analyser,
    isPlaying,
    onPlayPause,
    progress,
    funnyPic,
    onPlayNext,
    ...playerControlsProps
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    if (!track) return null;


    return (
        <div
            className={`
                fixed bottom-0 left-0 right-0 z-30
                bg-gray-800/80 backdrop-blur-md
                transition-all duration-500 ease-in-out
                ${isExpanded ? 'top-0' : 'top-[calc(100vh-4rem)]'}
            `}
        >
            <div className="relative w-full h-full flex flex-col">

                {/* 1. MINIMIZED VIEW (The Bottom Bar) */}
                <div
                    onClick={() => !isExpanded && setIsExpanded(true)}
                    className={`
                        absolute top-0 left-0 right-0 h-16 z-20
                        transition-opacity duration-300
                        ${isExpanded ? 'opacity-0 pointer-events-none' : 'opacity-100 cursor-pointer'}
                    `}
                >
                    <div className="absolute top-0 left-0 h-1 bg-indigo-500 transition-all duration-150" style={{ width: `${progress}%` }}></div>
                    <div className="grid grid-cols-3 items-center h-full px-4">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className="w-10 h-10 bg-gray-700 rounded-md flex-shrink-0 flex items-center justify-center overflow-hidden">
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
                            <button onClick={(e) => { e.stopPropagation(); playerControlsProps.onPrev(); }} className="text-gray-300 hover:text-white"><PrevIcon className="w-5 h-5" /></button>
                            <button onClick={(e) => { e.stopPropagation(); onPlayPause(); }} className="bg-white text-gray-900 rounded-full p-2 hover:scale-105 transition-transform">
                                {isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5" />}
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); playerControlsProps.onNext(); }} className="text-gray-300 hover:text-white"><NextIcon className="w-5 h-5" /></button>
                        </div>
                    </div>
                </div>

                {/* 2. EXPANDED VIEW (Full Screen) */}
                <div className={`
                    w-full h-full flex flex-col bg-gradient-to-b from-gray-900 via-gray-800 to-black bg-center
                    transition-opacity duration-300 ease-in-out delay-100
                    ${isExpanded ? 'opacity-100' : 'opacity-0 pointer-events-none'}
                `}
                    style={{
                        backgroundImage: `url(${funnyPic})`, // Corrected to use the variable
                        filter: ' brightness(0.50) saturate(1.4)',
                        // transform: 'scale(0.7)' 
                    }}>
                    {/* Close Button */}
                    <div className="flex-shrink-0 p-4">
                        <button onClick={() => setIsExpanded(false)} className="p-2 rounded-full hover:bg-white/10 transition-colors">
                            <ChevronDownIcon className="w-8 h-8 text-gray-400" />
                        </button>
                    </div>

                    <div className="flex-grow flex flex-col lg:flex-row p-6 gap-8 overflow-hidden">

                        {/* LEFT SIDE: Wide Visualizer + Center Avatar */}
                        <div className="flex flex-col items-center justify-center text-center w-full lg:w-2/3 space-y-8 relative">

                            {/* Visualizer wraps the entire area */}
                            <div className="absolute inset-0 z-0 opacity-100">
                                <AudioVisualizer funnyPic={funnyPic} analyser={analyser} isPlaying={isPlaying} />
                            </div>
                        </div>

                        {/* RIGHT SIDE: Queue */}
                        <div className="w-full lg:w-1/3 h-full flex flex-col bg-gray-900/50 backdrop-blur-sm rounded-3xl p-6 border border-white/5 overflow-hidden">
                            <h3 className="text-xl font-bold mb-4 text-white/90 flex items-center gap-2">
                                <span>Up Next</span>
                                <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full">{playQueue.length}</span>
                            </h3>
                            <div className="flex-grow overflow-y-auto custom-scrollbar">
                                <TrackList
                                    tracks={playQueue}
                                    currentTrack={track}
                                    onSelectTrack={onSelectFromQueue}
                                    onRemoveFromQueue={onRemoveFromQueue}
                                    onMoveToNext={onMoveToNext}
                                    onPlayNext={onPlayNext}
                                    emptyMessage={{ title: "Queue is empty.", subtitle: "Add some beats!" }}
                                    isQueueView={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Controls Bar */}
                    <div className="flex-shrink-0 bg-black/40 backdrop-blur-xl border-t border-white/5 p-2">
                        <PlayerControls
                            {...playerControlsProps}
                            isPlaying={isPlaying}
                            onPlayPause={onPlayPause}
                            disabled={!track}
                            currentTrack={track.file}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};