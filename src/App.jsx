import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
// Hooks
import { useMusicPlayer } from './hooks/useMusicPlayer';
import { usePlaylists } from './hooks/usePlaylists';
// Tauri / Plugins
import { open } from '@tauri-apps/plugin-dialog';
import { readDir, remove, rename } from '@tauri-apps/plugin-fs';
// Components
import { PlayerSheet } from './components/PlayerSheet.jsx';
import { TrackList } from './components/Playlist.jsx';
import { MusicIcon, FolderOpenIcon, SettingsIcon } from './components/Icons.jsx';
import { Downloader } from './components/Downloader.jsx';
import { useFunnyPics } from './hooks/useFunnyPics.js';

const App = () => {
  const [library, setLibrary] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderPath, setFolderPath] = useState(localStorage.getItem('music_folder') || '');
  const [showDownloader, setShowDownloader] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);

  // --- 1. THE RAM FIX (SINGLETONS) ---
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const internalAnalyserRef = useRef(null);

  const {
    audioRef, currentTrack, playQueue, setPlayQueue,
    currentTrackIndex, setCurrentTrackIndex,
    isPlaying, setIsPlaying, volume, setVolume,
    repeatMode, setRepeatMode, isShuffle, setIsShuffle,
    handleNext, handlePrev,
    currentTime, setCurrentTime, duration, setDuration, handlePlayNext
  } = useMusicPlayer();

  // Instance 1: Destructured for the PlayerSheet (linked to track)
  const { currentPic } = useFunnyPics(currentTrackIndex);
  
  // Instance 2: Destructured for the Background (linked to 30s timer)
  const { currentPic: backgroundPic } = useFunnyPics(null, 5000);

  // --- 2. OS MEDIA SESSION LOGIC ---
  useEffect(() => {
    if ('mediaSession' in navigator && currentTrack) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.file.name.replace(/\.[^/.]+$/, ""),
        artist: 'Local File',
        album: 'My Collection',
        artwork: [{ src: currentPic, sizes: '512x512', type: 'image/png' }]
      });

      navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
      navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
      navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleNext);
    }
  }, [currentTrack, currentPic, handleNext, handlePrev, setIsPlaying]);

  // --- 3. AUDIO CONTEXT SETUP (RAM GUARD) ---
  const setupAudioContext = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
        internalAnalyserRef.current = audioContextRef.current.createAnalyser();
        internalAnalyserRef.current.fftSize = 256;
      }

      if (!sourceNodeRef.current && audioRef.current) {
        sourceNodeRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceNodeRef.current.connect(internalAnalyserRef.current);
        internalAnalyserRef.current.connect(audioContextRef.current.destination);
      }

      if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
      }
    } catch (e) {
      console.error("Audio Context failed:", e);
    }
  }, [audioRef]);

  // --- 4. CORE LIBRARY LOGIC ---
  const loadMusic = useCallback(async (path) => {
    if (!path) return;
    try {
      const entries = await readDir(path);
      const tracks = entries
        .filter(e => e.name && !e.isDirectory && /\.(mp3|wav|m4a|flac)$/i.test(e.name))
        .map(e => ({
          file: { name: e.name },
          path: `${path}/${e.name}`,
          id: crypto.randomUUID()
        }));
      setLibrary(tracks.sort((a, b) => a.file.name.localeCompare(b.file.name)));
      localStorage.setItem('music_folder', path);
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { if (folderPath) loadMusic(folderPath); }, [loadMusic, folderPath]);

  const handlePickFolder = async () => {
    const selected = await open({ directory: true, title: "Select Music Folder" });
    if (selected) { setFolderPath(selected); loadMusic(selected); }
  };

  const { playlists, createPlaylist, handleAddToPlaylist, handleRemoveFromPlaylist, deletePlaylist } = usePlaylists(activePlaylistId);
  const activePlaylist = useMemo(() => playlists.find(pl => pl.id === activePlaylistId), [playlists, activePlaylistId]);
  const filteredLibrary = useMemo(() => {
    const source = activePlaylist ? activePlaylist.tracks : library;
    return source.filter(t => (t.file?.name || "").toLowerCase().includes(searchQuery.toLowerCase()));
  }, [library, searchQuery, activePlaylist]);

  const handleSelectTrack = (track, contextList) => {
    setPlayQueue(contextList);
    const index = contextList.findIndex(t => t.path === track.path);
    setCurrentTrackIndex(index !== -1 ? index : 0);
    setIsPlaying(true);
  };

  const handleRename = async (track) => {
    const newName = window.prompt("Enter new name:", track.file.name);
    if (!newName || newName === track.file.name) return;
    try {
      const oldPath = track.path;
      const directory = oldPath.substring(0, oldPath.lastIndexOf('/'));
      const newPath = `${directory}/${newName}`;
      await rename(oldPath, newPath);
      alert("File renamed successfully! Refreshing library...");
      window.location.reload();
    } catch (err) {
      console.error("Rename failed:", err);
    }
  };

  const handleDelete = async (track) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${track.file.name} forever?`);
    if (!confirmDelete) return;
    try {
      await remove(track.path);
      setLibrary(prev => prev.filter(t => t.path !== track.path));
      setPlayQueue(prev => prev.filter(t => t.path !== track.path));
      alert("File deleted from disk.");
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  const onRename = useCallback(async (track) => {
    handleRename(track)
  }, [library]);

  const onDelete = useCallback(async (track) => {
    handleDelete(track)
  }, [library, playQueue]);

  return (
    <div className="relative flex flex-col h-screen bg-black text-gray-200 overflow-hidden font-sans pb-10">
      
      {/* --- SLIDESHOW BACKGROUND LAYER --- */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute inset-0 transition-all duration-3000 ease-in-out bg-center"
          style={{ 
            backgroundImage: `url(${backgroundPic})`, // Corrected to use the variable
            filter: ' brightness(0.50) saturate(1.4)',
            // transform: 'scale(0.7)' 
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
      </div>

      {/* --- MAIN UI LAYER --- */}
      <div className="relative z-10 flex flex-col h-full overflow-hidden">
        <main className="flex-grow p-6 flex gap-8 overflow-hidden relative">
          <aside className="w-64 flex-shrink-0 flex flex-col gap-4">
            <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-3xl p-4 h-full flex flex-col">
              <button onClick={() => setActivePlaylistId(null)} className={`w-full text-left px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 transition-all ${!activePlaylistId ? 'bg-indigo-600 shadow-lg' : 'text-gray-400 hover:bg-white/5'}`}>
                <MusicIcon className="w-4 h-4" /> Collection
              </button>
              <div className="mt-6 px-4 flex-grow overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-500 uppercase font-black tracking-widest">Playlists</span>
                  <button onClick={() => { const n = prompt("Name:"); if (n) createPlaylist(n); }} className="text-indigo-400 hover:text-white text-xs">+ New</button>
                </div>
                <div className="space-y-1">
                  {playlists.map(pl => (
                    <div key={pl.id} className="group flex items-center gap-2">
                      <button onClick={() => setActivePlaylistId(pl.id)} className={`flex-grow text-left px-3 py-2 rounded-xl text-sm transition-all ${activePlaylistId === pl.id ? 'bg-indigo-600' : 'text-gray-400 hover:bg-white/5'}`}>{pl.name}</button>
                      <button onClick={() => deletePlaylist(pl.id)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-500 hover:text-red-400">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setShowDownloader(!showDownloader)} className="mt-auto pt-4 border-t border-white/5 flex items-center gap-2 text-[10px] text-gray-500 hover:text-indigo-400">
                <SettingsIcon className="w-3 h-3" /> Advanced Tools
              </button>
            </div>
          </aside>

          {showDownloader && <Downloader folderPath={folderPath} onClose={() => setShowDownloader(false)} onRefreshLibrary={() => loadMusic(folderPath)} />}

          <section className="flex-grow overflow-y-auto pb-40 custom-scrollbar">
            {library.length > 0 ? (
              <div>
                <h2 className="text-3xl font-black text-white mb-6">{activePlaylist ? activePlaylist.name : "Library"}</h2>
                <TrackList
                  tracks={filteredLibrary}
                  onSelectTrack={(t) => handleSelectTrack(t, activePlaylist ? activePlaylist.tracks : library)}
                  currentTrack={currentTrack} isPlaying={isPlaying} playlists={playlists}
                  onAddToPlaylist={handleAddToPlaylist} isPlaylistView={!!activePlaylist}
                  onRemoveFromPlaylist={(t) => handleRemoveFromPlaylist(activePlaylistId, t)}
                  isQueueView={false}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-40 cursor-pointer" onClick={handlePickFolder}>
                <FolderOpenIcon className="w-16 h-16 mb-4" />
                <p>Click to select music folder</p>
              </div>
            )}
          </section>
        </main>

        <PlayerSheet
          track={currentTrack}
          playQueue={playQueue}
          funnyPic={currentPic}
          analyser={internalAnalyserRef.current}
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          progress={duration > 0 ? (currentTime / duration) * 100 : 0}
          currentTime={currentTime} duration={duration}
          onSeek={t => { if (audioRef.current) { audioRef.current.currentTime = t; setCurrentTime(t); } }}
          volume={volume} onVolumeChange={setVolume}
          isShuffle={isShuffle} onToggleShuffle={() => setIsShuffle(!isShuffle)}
          repeatMode={repeatMode} onToggleRepeat={() => setRepeatMode(r => r === 'none' ? 'all' : r === 'all' ? 'one' : 'none')}
          onNext={handleNext} onPrev={handlePrev}
          onSelectFromQueue={(t) => {
            const idx = playQueue.findIndex(tr => tr.path === t.path);
            if (idx !== -1) { setCurrentTrackIndex(idx); setIsPlaying(true); }
          }}
          onPlayNext={handlePlayNext}
        />
      </div>

      <audio
        ref={audioRef}
        src={currentTrack?.url || null}
        loop={repeatMode === 'one'}
        crossOrigin='anonymous'
        onPlay={setupAudioContext}
        onEnded={handleNext}
        onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.target.duration)}
      />
    </div>
  );
};

export default App;