'use client';
import { useState, useEffect, useCallback, useMemo } from 'react';
import './CharacterView.css';

interface Outfit {
  id: number;
  src: string;
  name: string;
}

interface CharacterViewProps {
  currentOutfitIndex?: number; // 0-indexed outfit to display (based on game progress)
}

export default function CharacterView({ currentOutfitIndex = 0 }: CharacterViewProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [displayIndex, setDisplayIndex] = useState(0);
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter to show only unlocked outfits
  const unlockedOutfits = useMemo(() => {
    return outfits.slice(0, currentOutfitIndex + 1);
  }, [outfits, currentOutfitIndex]);

  // Reset display to last outfit when new ones unlock
  useEffect(() => {
    if (unlockedOutfits.length > 0) {
      setDisplayIndex(Math.min(displayIndex, unlockedOutfits.length - 1));
    }
  }, [unlockedOutfits.length]);

  // --- Navigation Logic ---
  const goToNext = useCallback(() => {
    if (unlockedOutfits.length === 0) return;
    setDisplayIndex((prev) => (prev === unlockedOutfits.length - 1 ? 0 : prev + 1));
  }, [unlockedOutfits.length]);

  const goToPrevious = useCallback(() => {
    if (unlockedOutfits.length === 0) return;
    setDisplayIndex((prev) => (prev === 0 ? unlockedOutfits.length - 1 : prev - 1));
  }, [unlockedOutfits.length]);

  // --- Keyboard Support ---
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goToPrevious();
      if (e.key === 'ArrowRight') goToNext();
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, goToPrevious, goToNext]);

  // --- Asset Loader ---
  useEffect(() => {
    const loadOutfits = () => {
      try {
        const context = (require as any).context(
          '../../images/anteater/outfits',
          false,
          /\.(png|jpg|jpeg|webp)$/i
        );

        const outfitList = context.keys().sort().map((key: string, index: number) => {
          const mod = context(key);
          const src = typeof mod === 'string' ? mod : mod.default?.src || mod.default || mod;
          
          return {
            id: index,
            src: src,
            name: `Outfit ${String(index + 1).padStart(2, '0')}`,
          };
        });

        setOutfits(outfitList);
      } catch (err) {
        console.error('Failed to load outfits:', err);
        setOutfits([]);
      } finally {
        setLoading(false);
      }
    };
    loadOutfits();
  }, []);

  return (
    <>
      <div className="cv-bookmark-tag">
        <button className="cv-tab-btn" onClick={() => setIsOpen(true)}>
          WARDROBE
        </button>
      </div>

      {isOpen && (
        <div className="cv-overlay" onClick={(e) => e.target === e.currentTarget && setIsOpen(false)}>
          <div className="cv-modal">
            <div className="cv-header">
              <h2 className="cv-title">Outfit Collection</h2>
              <button className="cv-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="cv-body">
              {loading ? (
                <div className="cv-empty-state"><p>Loading...</p></div>
              ) : unlockedOutfits.length === 0 ? (
                <div className="cv-empty-state"><p>No outfits unlocked yet.</p></div>
              ) : (
                <>
                  <div className="cv-carousel-container">
                    <div className="cv-carousel">
                      {unlockedOutfits.map((outfit, index) => {
                        const offset = index - displayIndex;
                        // Only render items near the center for performance
                        if (Math.abs(offset) > 2) return null;

                        return (
                          <div
                            key={outfit.id}
                            className="cv-carousel-item"
                            style={{ 
                              '--offset': offset,
                              zIndex: offset === 0 ? 100 : 50 - Math.abs(offset),
                            } as any}
                          >
                            <img
                              src={outfit.src}
                              alt={outfit.name}
                              className="cv-outfit-img"
                              onDragStart={(e) => e.preventDefault()}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <button className="cv-nav-btn cv-nav-btn--prev" onClick={goToPrevious} disabled={unlockedOutfits.length <= 1}>‹</button>
                    <button className="cv-nav-btn cv-nav-btn--next" onClick={goToNext} disabled={unlockedOutfits.length <= 1}>›</button>
                  </div>

                  <div className="cv-dots">
                    {unlockedOutfits.map((_, index) => (
                      <button
                        key={index}
                        className={`cv-dot ${index === displayIndex ? 'cv-dot--active' : ''}`}
                        onClick={() => setDisplayIndex(index)}
                      />
                    ))}
                  </div>

                  <div className="cv-info">
                    <p className="cv-outfit-name">{unlockedOutfits[displayIndex]?.name}</p>
                    <p className="cv-outfit-count">{displayIndex + 1} / {unlockedOutfits.length}</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}