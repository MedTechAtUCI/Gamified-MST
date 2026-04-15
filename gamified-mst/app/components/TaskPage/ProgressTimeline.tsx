'use client';

import { useEffect, useState } from 'react';
import './ProgressTimeline.css';

interface ProgressTimelineProps {
  currentLevel: number;
  totalLevels: number;
  currentOutfitIndex: number;
  totalOutfits: number;
}

const DIALOGUES = [
  "Keep at it! You're doing great!",
  "I believe in you! You've got this!",
  "Halfway there! Don't give up now!",
  "You're almost done! Push through!",
  "Amazing progress! Keep it up!",
  "You're crushing it! One more push!",
];

export default function ProgressTimeline({
  currentLevel,
  totalLevels,
  currentOutfitIndex,
  totalOutfits,
}: ProgressTimelineProps) {
  const [currentOutfitImage, setCurrentOutfitImage] = useState<string | null>(null);
  const [selectedDialogue, setSelectedDialogue] = useState<string | null>(null);
  const [bubblePercentage, setBubblePercentage] = useState<number | null>(null);
  const [isStudyComplete, setIsStudyComplete] = useState(false);

  // Load the current outfit image
  useEffect(() => {
    const loadOutfitImage = async () => {
      try {
        const context = (require as any).context(
          '../../images/anteater/outfits',
          false,
          /\.(png|jpg|jpeg|webp)$/i
        );

        const keys = context.keys().sort();
        if (keys.length > currentOutfitIndex) {
          const mod = context(keys[currentOutfitIndex]);
          const src = typeof mod === 'string' ? mod : mod.default?.src || mod.default || mod;
          setCurrentOutfitImage(src);
        }
      } catch (err) {
        console.error('Failed to load outfit image:', err);
      }
    };

    loadOutfitImage();
  }, [currentOutfitIndex]);

  const handleOutfitClick = () => {
    setBubblePercentage(progressPercentage);
    const dialogue = DIALOGUES[currentOutfitIndex % DIALOGUES.length];
    setSelectedDialogue(dialogue);
    setTimeout(() => {
      setSelectedDialogue(null);
      setBubblePercentage(null);
    }, 2500);
  };

  // Cap progress at 100% when complete, otherwise show current progress
  const rawPercentage = totalLevels > 0 ? (currentLevel / totalLevels) * 100 : 0;
  const progressPercentage = isStudyComplete ? 100 : Math.min(rawPercentage, 100);

  return (
    <div className="pt-container">
      <div className="pt-track">
        {selectedDialogue && bubblePercentage !== null && (
          <div 
            className="pt-dialogue-bubble" 
            style={{ left: `${bubblePercentage}%` }}
          >
            <p>{selectedDialogue}</p>
          </div>
        )}

        {currentOutfitImage && (
          <button
            className="pt-outfit-button"
            style={{ left: `${progressPercentage}%` }}
            onClick={handleOutfitClick}
          >
            <img
              src={currentOutfitImage}
              alt="Current Outfit"
              className="pt-outfit-img"
            />
          </button>
        )}
      </div>
    </div>
  );
}
