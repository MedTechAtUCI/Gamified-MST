'use client';

import { useState } from 'react';
import peterAnteater from '../../images/anteater/peter_anteater.png';
import img1 from '../../images/walkthrough/pcon001b.jpg';
import img2 from '../../images/walkthrough/pcon022a.jpg';
import img3 from '../../images/walkthrough/pcon022b.jpg';
import './Walkthrough.css';

type Step = {
  dialogue: string;
  highlight: 'old' | 'similar' | 'new' | null;
  imageIndex?: number; // 0 for img1 (pcon001b), 1 for img2 (pcon022a), 2 for img3 (pcon022b)
  sideBySide?: boolean; // For showing img2 and img3 together
};

const STEPS: Step[] = [
  { dialogue: "Hi there! Before we start, let me walk you through how this works!", highlight: null, imageIndex: 0},
  { dialogue: "You'll see photos one at a time inside my scrapbook. Decide if you've seen each photo before!", highlight: null, imageIndex: 0 },
  { dialogue: "This is a NEW photo you've never seen before. Press NEW!", highlight: 'new', imageIndex: 0 },
  { dialogue: "Here's another NEW photo. Press NEW!", highlight: 'new', imageIndex: 1 },
  { dialogue: "Now I'm showing you the SAME photo again. Press OLD because you just saw it!", highlight: 'old', imageIndex: 0 },
  { dialogue: "This photo looks very similar to the earlier one, but notice the differences! Press SIMILAR!", highlight: 'similar', imageIndex: 2 },
  { dialogue: "See the difference? The left is the original, the right has tiny changes. These tricky similar ones are what make the game challenging!", highlight: null, sideBySide: true },
  { dialogue: "That's it! You're ready to test your memory skills!", highlight: null, sideBySide: true },
];

const CHOICES = ['Old', 'Similar', 'New'] as const;

interface WalkthroughProps {
  onComplete: () => void;
}

export default function Walkthrough({ onComplete }: WalkthroughProps) {
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  const { dialogue, highlight, imageIndex, sideBySide } = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  const images = [img1, img2, img3];
  const displayImage = imageIndex !== undefined ? images[imageIndex].src : null;
  const hasImage = imageIndex !== undefined && !sideBySide;
  const isClickable = !!(highlight && (hasImage || sideBySide));

  const handleButtonClick = (choice: string) => {
    // Only allow clicks on steps with highlighting
    if (!highlight) return;

    const isCorrect = choice.toLowerCase() === highlight;
    if (isCorrect) {
      setFeedback("✓ Great! Now let's move on.");
      setTimeout(() => {
        setFeedback(null);
        setStep((s) => s + 1);
      }, 1200);
    } else {
      setFeedback("Not quite! Try the " + highlight.toUpperCase() + " button.");
      setTimeout(() => setFeedback(null), 1500);
    }
  };

  return (
    <div className="wt-overlay">
      <div className="wt-card">
        <div className="wt-header">
          <h2 className="wt-title">How to Play</h2>
          <button className="wt-close" onClick={onComplete}>✕</button>
        </div>

        <div className="wt-mock-trial">
          {sideBySide ? (
            <div className="wt-side-by-side">
              <div className="wt-image-wrapper">
                <img src={img2.src} className="wt-mock-image" alt="Original" />
                <p className="wt-image-label">Original</p>
              </div>
              <div className="wt-image-wrapper">
                <img src={img3.src} className="wt-mock-image" alt="Similar" />
                <p className="wt-image-label">Similar (Different)</p>
              </div>
            </div>
          ) : hasImage ? (
            <img src={displayImage as string} className="wt-mock-image" alt="Sample" />
          ) : (
            <div className="wt-mock-image"></div>
          )}
          <div className="wt-mock-buttons">
            {CHOICES.map((label) => {
              const isActive = highlight === label.toLowerCase();
              return (
                <button
                  key={label}
                  className={`wt-mock-btn ${isActive ? 'wt-mock-btn--active' : ''} ${isClickable ? 'wt-mock-btn--clickable' : ''}`}
                  onClick={() => isClickable && handleButtonClick(label)}
                  disabled={!isClickable}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {feedback && <div className="wt-feedback">{feedback}</div>}

        <div className="wt-peter-row">
          <div className="wt-bubble">
            <p>{dialogue}</p>
          </div>
          <img src={peterAnteater.src} className="wt-peter-img" alt="Peter" />
        </div>

        <div className="wt-footer">
          <button
            className="wt-btn wt-btn--secondary"
            onClick={() => {
              setFeedback(null);
              setStep((s) => s - 1);
            }}
            disabled={isFirst}
          >
            ← Back
          </button>
          <div className="wt-dots">
            {STEPS.map((_, i) => (
              <span key={i} className={`wt-dot ${i === step ? 'wt-dot--active' : ''}`} />
            ))}
          </div>
          <button
            className="wt-btn"
            onClick={() => {
              setFeedback(null);
              if (isLast) onComplete();
              else setStep((s) => s + 1);
            }}
            disabled={isClickable}
          >
            {isLast ? "Let's Start!" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
