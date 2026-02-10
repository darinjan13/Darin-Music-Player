import React, { useState, useEffect, useRef } from 'react'; 
import { invoke } from '@tauri-apps/api/core';
import { Command } from '@tauri-apps/plugin-shell';

export const Downloader = ({ folderPath, onClose, onRefreshLibrary }) => {
    const [url, setUrl] = useState('');
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState(0);
    const [isPlaylist, setIsPlaylist] = useState(false);
    const [songTitle, setSongTitle] = useState('');
    const [isSkipped, setIsSkipped] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false); // New state

    const activeCommandRef = useRef(null);

    useEffect(() => {
        return () => {
            if (activeCommandRef.current) {
                console.log("Component closing: Killing yt-dlp process...");
                activeCommandRef.current.kill();
            }
        };
    }, []);

    const resetDownloader = () => {
        setUrl('');
        setSongTitle('');
        setProgress(0);
        setStatus('idle');
        setIsSkipped(false);
    };

    const handleManualClose = (e) => {
        e.stopPropagation(); // Prevent trigger toggle if clicking close
        if (activeCommandRef.current) {
            activeCommandRef.current.kill();
        }
        onClose();
    };

    const startDownload = async () => {
        if (!url || !folderPath) return;
        setStatus('downloading');
        setProgress(0);

        try {
            const playlistFlag = isPlaylist ? '--yes-playlist' : '--no-playlist';
            const command = Command.sidecar('bin/yt-dlp', [
                '--newline',
                playlistFlag,
                '-x',
                '--audio-format',
                'mp3',
                '--progress',
                '--progress-template',
                '%(progress._percent_str)s',
                url,
                '-o',
                `${folderPath}/%(title)s.%(ext)s`
            ]);

            activeCommandRef.current = command;

            command.stdout.on('data', (line) => {
                if (line.includes('has already been downloaded')) {
                    setIsSkipped(true);
                    setProgress(100);
                }
                if (line.includes('[download] Destination:')) {
                    const rawTitle = line.split(/[\\/]/).pop();
                    const cleanTitle = rawTitle.replace(/\.[^/.]+$/, "");
                    setSongTitle(cleanTitle);
                }
                const match = line.match(/(\d+\.\d+)%/);
                if (match) {
                    setProgress(parseFloat(match[1]));
                }
                if (line.includes('[ExtractAudio]') || line.includes('Deleting original file')) {
                    onRefreshLibrary();
                }
            });

            command.stderr.on('data', line => console.error(`Error: ${line}`));
            command.on('close', data => {
                activeCommandRef.current = null;
                if (data.code === 0) {
                    setStatus('finished');
                    onRefreshLibrary();
                }
            });

            await command.spawn();
        } catch (err) {
            console.error("Failed to spawn sidecar:", err);
            setStatus('error');
        }
    };

    return (
        <div 
            className={`absolute top-4 right-6 z-50 transition-all duration-300 ease-in-out shadow-2xl overflow-hidden
                ${isMinimized 
                    ? 'w-48 bg-indigo-600 rounded-full p-2 cursor-pointer hover:bg-indigo-500' 
                    : 'w-80 bg-slate-900/95 backdrop-blur-2xl border border-white/10 p-5 rounded-3xl'
                }`}
            onClick={() => isMinimized && setIsMinimized(false)}
        >
            {isMinimized ? (
                /* --- MINIMIZED PILL VIEW --- */
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center space-x-2 truncate">
                        <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
                        <span className="text-[10px] font-bold text-white uppercase tracking-wider truncate">
                            {status === 'downloading' ? `${Math.round(progress)}%` : 'Grabber'}
                        </span>
                    </div>
                    <button 
                        onClick={handleManualClose}
                        className="text-white/50 hover:text-white ml-2"
                    >✕</button>
                </div>
            ) : (
                /* --- FULL EXPANDED VIEW --- */
                <>
                    <div className="flex justify-between items-center mb-4">
                        <div className="flex flex-col">
                            <h3 className="text-xs font-black uppercase tracking-widest text-indigo-400">Audio Grabber</h3>
                            <p className="text-[10px] text-gray-500">YouTube to Local Library</p>
                        </div>
                        <div className="flex items-center space-x-3">
                            <button 
                                onClick={() => setIsMinimized(true)}
                                className="text-gray-500 hover:text-white transition-colors text-lg"
                                title="Minimize"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </button>
                            <button onClick={handleManualClose} className="text-gray-500 hover:text-white transition-colors">✕</button>
                        </div>
                    </div>

                    {status !== 'idle' && (
                        <div className="mb-4 p-2 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Current Track</p>
                            <p className="text-xs text-white font-medium truncate">{songTitle || 'Fetching metadata...'}</p>
                        </div>
                    )}

                    {status === 'idle' && (
                        <div className="flex items-center space-x-2 mb-4 px-2">
                            <input
                                type="checkbox"
                                id="playlist"
                                checked={isPlaylist}
                                onChange={(e) => setIsPlaylist(e.target.checked)}
                                className="w-4 h-4 rounded border-white/10 bg-black/40 text-indigo-600"
                            />
                            <label htmlFor="playlist" className="text-[10px] text-gray-400 uppercase font-bold tracking-wider cursor-pointer">
                                Include Playlist?
                            </label>
                        </div>
                    )}

                    <div className="space-y-4">
                        {status === 'idle' && (
                            <>
                                <input
                                    type="text"
                                    placeholder="Paste YouTube Link..."
                                    value={url}
                                    onChange={(e) => setUrl(e.target.value)}
                                    className="w-full bg-black/40 border border-white/5 rounded-xl py-3 px-4 text-xs focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all text-white"
                                />
                                <button
                                    onClick={startDownload}
                                    className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition-all active:scale-95 text-white"
                                >
                                    Fetch Audio
                                </button>
                            </>
                        )}

                        {(status === 'downloading' || status === 'finished') && (
                            <div className="py-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">
                                        {status === 'downloading' ? 'Processing...' : (isSkipped ? 'Already in Library' : 'Download Complete!')}
                                    </span>
                                    <span className="text-xs font-mono text-indigo-400">{Math.round(progress)}%</span>
                                </div>

                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ease-out ${status === 'finished' ? 'bg-emerald-500' : 'bg-indigo-500'}`}
                                        style={{ width: `${progress}%` }}
                                    />
                                </div>

                                {status === 'finished' ? (
                                    <button
                                        onClick={resetDownloader}
                                        className="mt-4 w-full bg-white/10 hover:bg-white/20 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white transition-all"
                                    >
                                        + Download Another
                                    </button>
                                ) : (
                                    <p className="mt-3 text-[10px] text-gray-500 italic truncate">
                                        Saving to {folderPath.split(/[\\/]/).pop()}...
                                    </p>
                                )}
                            </div>
                        )}

                        {status === 'error' && (
                            <div className="text-center py-2">
                                <p className="text-xs text-red-400 mb-3 font-medium">Download failed.</p>
                                <button onClick={resetDownloader} className="text-[10px] text-indigo-400 underline uppercase font-bold tracking-widest">Try Again</button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};