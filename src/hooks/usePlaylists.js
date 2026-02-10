import { useState, useEffect } from 'react';
import { LazyStore } from '@tauri-apps/plugin-store';

const store = new LazyStore('playlists.json');

export const usePlaylists = () => {
  const [playlists, setPlaylists] = useState([]);

  useEffect(() => {
    store.get('playlists').then(saved => saved && setPlaylists(saved));
  }, []);

  const saveToDisk = async (newPlaylists) => {
    setPlaylists(newPlaylists);
    await store.set('playlists', newPlaylists);
    await store.save();
  };

  const createPlaylist = (name) => {
    const newPlaylist = { id: crypto.randomUUID(), name, tracks: [] };
    saveToDisk([...playlists, newPlaylist]);
  };

  const deletePlaylist = (id) => {
    saveToDisk(playlists.filter(p => p.id !== id));
  };

  const handleAddToPlaylist = (playlistId, track) => {
    const updated = playlists.map(pl => {
      if (pl.id === playlistId) {
        // Prevent duplicates in playlist
        if (pl.tracks.some(t => t.path === track.path)) return pl;
        return { ...pl, tracks: [...pl.tracks, track] };
      }
      return pl;
    });
    saveToDisk(updated);
  };

  const handleRemoveFromPlaylist = (playlistId, track) => {
    const updated = playlists.map(pl => {
      if (pl.id === playlistId) {
        return { ...pl, tracks: pl.tracks.filter(t => t.path !== track.path) };
      }
      return pl;
    });
    saveToDisk(updated);
  };

  return { 
    playlists, 
    createPlaylist, 
    deletePlaylist, 
    handleAddToPlaylist, 
    handleRemoveFromPlaylist 
  };
};