import { useState, useCallback, useMemo } from 'react';

interface GameState {
  currentLevel: number;
  totalLevels: number;
}

export const useGameState = (totalLevels: number) => {
  const [currentLevel, setCurrentLevel] = useState(0);

  // Calculate outfit unlock thresholds based on total levels and number of outfits
  const calculateUnlockThresholds = useCallback(
    (numOutfits: number): number[] => {
      const thresholds: number[] = [];
      for (let i = 0; i < numOutfits; i++) {
        thresholds.push(Math.floor((i / numOutfits) * totalLevels));
      }
      return thresholds;
    },
    [totalLevels]
  );

  // Get current outfit index based on current level and unlock thresholds
  const getCurrentOutfitIndex = useCallback(
    (numOutfits: number): number => {
      const thresholds = calculateUnlockThresholds(numOutfits);
      let currentOutfit = 0;
      
      for (let i = 0; i < thresholds.length; i++) {
        if (currentLevel >= thresholds[i]) {
          currentOutfit = i;
        }
      }
      
      return currentOutfit;
    },
    [currentLevel, calculateUnlockThresholds]
  );

  // Percent for rendering
  const getProgressPercentage = useCallback((): number => {
    if (totalLevels === 0) return 0;
    return Math.round((currentLevel / totalLevels) * 100);
  }, [currentLevel, totalLevels]);

  // Advance to the next level and check if a new outfit is unlocked
  const advanceLevel = useCallback(
    (numOutfits: number): { outfitUnlocked: boolean; newOutfitIndex: number } => {
      const oldOutfitIndex = getCurrentOutfitIndex(numOutfits);
      const newLevel = Math.min(currentLevel + 1, totalLevels);
      setCurrentLevel(newLevel);
      
      const newOutfitIndex = getCurrentOutfitIndex(numOutfits);
      const outfitUnlocked = newOutfitIndex > oldOutfitIndex;
      
      return { outfitUnlocked, newOutfitIndex };
    },
    [currentLevel, totalLevels, getCurrentOutfitIndex]
  );

  const reset = useCallback(() => {
    setCurrentLevel(0);
  }, []);

  return {
    currentLevel,
    totalLevels,
    setCurrentLevel,
    getCurrentOutfitIndex,
    getProgressPercentage,
    advanceLevel,
    reset,
    calculateUnlockThresholds,
  };
};
