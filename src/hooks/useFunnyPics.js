import { useState, useEffect, useCallback, useRef } from 'react';
import { appDataDir, join } from '@tauri-apps/api/path';
import { readDir } from '@tauri-apps/plugin-fs';
import { convertFileSrc } from '@tauri-apps/api/core';

export const useFunnyPics = (trackIndex = null, interval = null) => {
  const [pics, setPics] = useState([]);
  const [currentPic, setCurrentPic] = useState(null);
  const remainingIndices = useRef([]);

  // 1. Fetch all files from the AppData Vault
  const loadVaultPics = useCallback(async () => {
    try {
      const appData = await appDataDir();
      const vaultPath = await join(appData, '.idx_vault');
      const entries = await readDir(vaultPath);
      
      // Filter for common image types and convert to local browser URLs
      const imagePaths = entries
        .filter(e => /\.(jpeg|jpg|png|webp|dat|bin)$/i.test(e.name)) // Added .dat/.bin for your "stealth" files later
        .map(e => convertFileSrc(`${vaultPath}/${e.name}`));
      
      setPics(imagePaths);
    } catch (err) {
      console.error("Could not read AppData vault:", err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadVaultPics();
  }, [loadVaultPics]);

  // 2. The logic to pick the next random image
  const getNextPic = useCallback(() => {
    if (pics.length === 0) return;

    if (remainingIndices.current.length === 0) {
      // Create a shuffled deck of indices
      const deck = Array.from({ length: pics.length }, (_, i) => i);
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
      remainingIndices.current = deck;
    }

    const nextIndex = remainingIndices.current.pop();
    setCurrentPic(pics[nextIndex]);
  }, [pics]);

  // Trigger on song change
  useEffect(() => {
    if (trackIndex !== null && pics.length > 0) {
      getNextPic();
    }
  }, [trackIndex, pics.length, getNextPic]);

  // Trigger on timer (Background Slideshow)
  useEffect(() => {
    if (interval && pics.length > 0) {
      const timer = setInterval(getNextPic, interval);
      return () => clearInterval(timer);
    }
  }, [interval, pics.length, getNextPic]);

  return { currentPic };
};