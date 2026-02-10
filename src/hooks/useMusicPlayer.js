import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { convertFileSrc } from '@tauri-apps/api/core';

export const useMusicPlayer = () => {
    const [playQueue, setPlayQueue] = useState([]);
    const [currentTrackIndex, setCurrentTrackIndex] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(Number(localStorage.getItem('player_volume')) || 0.75);
    const [repeatMode, setRepeatMode] = useState('none');
    const [isShuffle, setIsShuffle] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);

    const audioRef = useRef(null);

    const currentTrack = useMemo(() => {
        const track = (currentTrackIndex !== null && playQueue[currentTrackIndex])
            ? playQueue[currentTrackIndex]
            : null;
        return track ? { ...track, url: convertFileSrc(track.path) } : null;
    }, [currentTrackIndex, playQueue]);

    // Volume Sync
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            localStorage.setItem('player_volume', volume);
        }
    }, [volume]);

    // Play/Pause Sync
    useEffect(() => {
        if (!audioRef.current || !currentTrack) return;
        if (isPlaying) {
            audioRef.current.play().catch(() => setIsPlaying(false));
        } else {
            audioRef.current.pause();
        }
    }, [isPlaying, currentTrack]);

    const handleNext = useCallback(() => {
        if (playQueue.length === 0) return;

        if (isShuffle && playQueue.length > 1) {
            let randomIndex;
            do {
                randomIndex = Math.floor(Math.random() * playQueue.length);
            } while (randomIndex === currentTrackIndex);
            setCurrentTrackIndex(randomIndex);
        } else {
            setCurrentTrackIndex((prev) =>
                prev === playQueue.length - 1 ? 0 : prev + 1
            );
        }
        setIsPlaying(true);
    }, [playQueue, isShuffle, currentTrackIndex]);

    const handlePrev = useCallback(() => {
        if (playQueue.length === 0) return;
        let prevIndex = currentTrackIndex - 1;
        if (prevIndex < 0) prevIndex = playQueue.length - 1;
        setCurrentTrackIndex(prevIndex);
    }, [currentTrackIndex, playQueue]);

    const handlePlayNext = (track) => {
        setPlayQueue(prev => {
            const trackToMoveIndex = prev.findIndex(t => t.path === track.path);
            if (trackToMoveIndex === -1) return prev;
            const newQueue = [...prev];
            const [movedTrack] = newQueue.splice(trackToMoveIndex, 1);
            let newCurrentIndex = currentTrackIndex;
            if (trackToMoveIndex < currentTrackIndex) {
                newCurrentIndex -= 1;
            }
            newQueue.splice(newCurrentIndex + 1, 0, movedTrack);
            setCurrentTrackIndex(newCurrentIndex);
            return newQueue;
        });
    };

    // --- NEW: OS Media Session Playback State & Position Sync ---
    useEffect(() => {
        if ('mediaSession' in navigator) {
            // Tells the OS if we are "playing" or "paused"
            navigator.mediaSession.playbackState = isPlaying ? "playing" : "paused";

            // Updates the progress bar in the OS overlay
            if (duration > 0) {
                navigator.mediaSession.setPositionState({
                    duration: duration,
                    playbackRate: audioRef.current?.playbackRate || 1,
                    position: currentTime,
                });
            }
        }
    }, [isPlaying, currentTime, duration]);

    // --- UPDATED: OS Media Session (Metadata & Actions) ---
    useEffect(() => {
        if ('mediaSession' in navigator && currentTrack) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: currentTrack.file.name.replace(/\.[^/.]+$/, ""),
                artist: 'Darin Music Player',
                album: 'Local Collection'
            });

            navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
            navigator.mediaSession.setActionHandler('pause', () => setIsPlaying(false));
            navigator.mediaSession.setActionHandler('nexttrack', handleNext);
            navigator.mediaSession.setActionHandler('previoustrack', handlePrev);
            
            // Allow the user to seek using the OS progress bar
            navigator.mediaSession.setActionHandler('seekto', (details) => {
                if (audioRef.current) {
                    audioRef.current.currentTime = details.seekTime;
                    setCurrentTime(details.seekTime);
                }
            });
        }
    }, [currentTrack, handleNext, handlePrev]);

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
        currentTime,
        setCurrentTime,
        duration,
        setDuration,
        handlePlayNext
    };
};