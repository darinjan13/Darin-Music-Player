// db.js
import { platform } from '@tauri-apps/api/os';

// We'll use localStorage because for a single string path and small playlists, 
// it's significantly faster and uses less RAM than IndexedDB.

const DIR_KEY = 'sonic_player_dir';
const PLAYLIST_KEY = 'sonic_player_playlists';

// 1. Directory Path Management
export const getDirectoryHandle = async () => {
    // We return the string path directly
    return localStorage.getItem(DIR_KEY);
};

export const saveDirectoryHandle = async (path) => {
    if (typeof path === 'string') {
        localStorage.setItem(DIR_KEY, path);
    }
};

// 2. Playlist Management
export const getPlaylists = async () => {
    const data = localStorage.getItem(PLAYLIST_KEY);
    return data ? JSON.parse(data) : {};
};

export const savePlaylists = async (playlists) => {
    localStorage.setItem(PLAYLIST_KEY, JSON.stringify(playlists));
};