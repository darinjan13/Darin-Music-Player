import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Hooks
import { useMusicPlayer } from './hooks/useMusicPlayer';
import { usePlaylists } from './hooks/usePlaylists';
import { useFunnyPics } from './hooks/useFunnyPics';
import { useTrackSettings } from './hooks/useTrackSettings';

// Tauri
import { open } from '@tauri-apps/plugin-dialog';
import { readDir, remove, rename } from '@tauri-apps/plugin-fs';

// Components
import { PlayerSheet } from './components/PlayerSheet';
import { TrackList } from './components/Playlist';
import { Downloader } from './components/Downloader';
import {
  MusicIcon,
  FolderOpenIcon,
  SettingsIcon
} from './components/Icons';

const App = () => {
  const [library, setLibrary] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [folderPath, setFolderPath] = useState(localStorage.getItem('music_folder') || '');
  const [showDownloader, setShowDownloader] = useState(false);
  const [activePlaylistId, setActivePlaylistId] = useState(null);

  // Audio analyser singletons
  const audioContextRef = useRef(null);
  const sourceNodeRef = useRef(null);
  const analyserRef = useRef(null);

  const {
    setTrackCrossfade,
    removeTrackCrossfade,
    getTrackCrossfade,
  } = useTrackSettings();

  const {
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
    audioNextRef,
    crossfadeEnabled
  } = useMusicPlayer(getTrackCrossfade);

  const { currentPic } = useFunnyPics(currentTrackIndex);
  const { currentPic: backgroundPic } = useFunnyPics(null, 5000);

  // ---------------------------
  // AudioContext setup (visualizer)
  // ---------------------------
  const setupAudioContext = useCallback(() => {
    try {
      // create source ONLY once
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();

        sourceNodeRef.current =
          audioContextRef.current.createMediaElementSource(audioRef.current);

        sourceNodeRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }


      if (audioContextRef.current.state === "suspended") {
        audioContextRef.current.resume();
      }
    } catch (err) {
      console.error("AudioContext error:", err);
    }
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      setupAudioContext();
    }
  }, [currentTrack]);

  // ---------------------------
  // Library loading
  // ---------------------------
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
    } catch (err) {
      console.error(err);
    }
  }, []);

  useEffect(() => {
    if (folderPath) loadMusic(folderPath);
  }, [folderPath, loadMusic]);

  const handlePickFolder = async () => {
    const selected = await open({ directory: true });
    if (selected) {
      setFolderPath(selected);
      loadMusic(selected);
    }
  };

  // ---------------------------
  // Playlists
  // ---------------------------
  const {
    playlists,
    createPlaylist,
    handleAddToPlaylist,
    handleRemoveFromPlaylist,
    deletePlaylist
  } = usePlaylists();

  const activePlaylist = useMemo(
    () => playlists.find(p => p.id === activePlaylistId),
    [playlists, activePlaylistId]
  );

  const filteredLibrary = useMemo(() => {
    const source = activePlaylist ? activePlaylist.tracks : library;
    return source.filter(t =>
      t.file.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [library, activePlaylist, searchQuery]);

  const handleSelectTrack = (track, list) => {
    setPlayQueue(list);
    const idx = list.findIndex(t => t.path === track.path);
    setCurrentTrackIndex(idx !== -1 ? idx : 0);
    setIsPlaying(true);
  };

  // ---------------------------
  // File operations
  // ---------------------------
  const handleRename = async (track) => {
    const newName = prompt('Rename file:', track.file.name);
    if (!newName) return;
    const dir = track.path.substring(0, track.path.lastIndexOf('/'));
    await rename(track.path, `${dir}/${newName}`);
    window.location.reload();
  };

  const handleDelete = async (track) => {
    if (!confirm(`Delete ${track.file.name}?`)) return;
    await remove(track.path);
    setLibrary(prev => prev.filter(t => t.path !== track.path));
    setPlayQueue(prev => prev.filter(t => t.path !== track.path));
  };

  const handleSelectFromQueue = (track) => {
    const idx = playQueue.findIndex(t => t.path === track.path);
    if (idx === -1) return;
    setCurrentTrackIndex(idx);
    setIsPlaying(true);
  };

  const handleSetTrackCrossfade = (track, seconds) => {
    if (seconds === null || seconds === undefined) {
      removeTrackCrossfade(track.path);
    } else {
      setTrackCrossfade(track.path, seconds);
    }
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="relative h-screen bg-black text-gray-200 overflow-hidden">

      {/* Background */}
      <div
        className="fixed inset-0 z-0 bg-center bg-cover"
        style={{ backgroundImage: `url(${backgroundPic})`, filter: 'brightness(0.5)' }}
      />

      <div className="relative z-10 flex h-full">

        {/* Sidebar */}
        <aside className="w-72 p-4 bg-black/50 backdrop-blur-2xl border-r border-white/5 flex flex-col gap-4">

          {/* App Section */}
          <div className="space-y-2">
            <button
              onClick={() => setActivePlaylistId(null)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all
        ${activePlaylistId === null
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                  : 'text-gray-400 hover:bg-white/5'
                }`}
            >
              <MusicIcon className="w-4 h-4" />
              Collection
            </button>
          </div>

          {/* Divider */}
          <div className="h-px bg-white/10 my-2" />

          {/* Playlists Header */}
          <div className="flex items-center justify-between px-2">
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
              Playlists
            </span>
            <button
              onClick={() => {
                const name = prompt('Playlist name');
                if (name) createPlaylist(name);
              }}
              className="text-xs text-indigo-400 hover:text-white transition"
            >
              + New
            </button>
          </div>

          {/* Playlists List */}
          <div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            {playlists.map(pl => {
              const isActive = activePlaylistId === pl.id;

              return (
                <div key={pl.id} className="group flex items-center gap-2">
                  <button
                    onClick={() => setActivePlaylistId(pl.id)}
                    className={`flex-1 flex items-center px-4 py-2 rounded-xl text-sm transition-all
              ${isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                        : 'text-gray-400 hover:bg-white/5'
                      }`}
                  >
                    {pl.name}
                  </button>

                  <button
                    onClick={() => deletePlaylist(pl.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 transition px-2"
                    title="Delete playlist"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-grow" />

          {/* Advanced Tools */}
          <button
            onClick={() => setShowDownloader(!showDownloader)}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-xs text-gray-400 hover:text-indigo-400 hover:bg-white/5 transition"
          >
            <SettingsIcon className="w-4 h-4" />
            Advanced Tools
          </button>
        </aside>

        {/* Main */}
        <main className="flex-1 p-6 overflow-y-auto pb-40">
          {library.length === 0 ? (
            <div
              onClick={handlePickFolder}
              className="h-full flex flex-col items-center justify-center opacity-40 cursor-pointer"
            >
              <FolderOpenIcon className="w-16 h-16 mb-4" />
              Select music folder
            </div>
          ) : (
            <TrackList
              tracks={filteredLibrary}
              currentTrack={currentTrack}
              isPlaying={isPlaying}
              playlists={playlists}
              onAddToPlaylist={handleAddToPlaylist}
              onRemoveFromPlaylist={(t) =>
                handleRemoveFromPlaylist(activePlaylistId, t)
              }
              onSelectTrack={(t) =>
                handleSelectTrack(
                  t,
                  activePlaylist ? activePlaylist.tracks : library
                )
              }
              onRename={handleRename}
              onDelete={handleDelete}
              onSetCrossfade={handleSetTrackCrossfade}
              getTrackCrossfade={getTrackCrossfade}
            />
          )}
        </main>
      </div>

      {/* Player */}
      <PlayerSheet
        track={currentTrack}
        playQueue={playQueue}
        analyser={analyserRef.current}
        funnyPic={currentPic}
        isPlaying={isPlaying}
        onPlayPause={() => setIsPlaying(!isPlaying)}
        progress={
          duration > 0
            ? (currentTimeRef.current / duration) * 100
            : 0
        }
        duration={duration}
        onSeek={(t) => {
          audioRef.current.currentTime = t;
          currentTimeRef.current = t;
        }}
        volume={volume}
        onVolumeChange={setVolume}
        isShuffle={isShuffle}
        onToggleShuffle={() => setIsShuffle(!isShuffle)}
        repeatMode={repeatMode}
        onToggleRepeat={() =>
          setRepeatMode(r =>
            r === 'none' ? 'all' : r === 'all' ? 'one' : 'none'
          )
        }
        onNext={handleNext}
        onPrev={handlePrev}
        onPlayNext={handlePlayNext}
        currentTimeRef={currentTimeRef}
        onSelectFromQueue={handleSelectFromQueue}
        onSetCrossfade={handleSetTrackCrossfade}
        getTrackCrossfade={getTrackCrossfade}
      />

      {/* Downloader */}
      {showDownloader && (
        <Downloader
          folderPath={folderPath}
          onClose={() => setShowDownloader(false)}
          onRefreshLibrary={() => loadMusic(folderPath)}
        />
      )}

      {/* Audio */}
      <>
        <audio
          ref={audioRef}
          loop={repeatMode === 'one'}
          crossOrigin="anonymous"
          onPlay={setupAudioContext}
          onEnded={() => {
            if (!crossfadeEnabled) handleNext();
          }}
        />

        {/* Hidden second audio for crossfade */}
        <audio
          ref={audioNextRef}
          crossOrigin="anonymous"
          style={{ display: "none" }}
        />
      </>

    </div>
  );
};

export default App;
