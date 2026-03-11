'use client';

import { useState } from 'react';
import peterAnteater from '../../images/anteater/peter_anteater.png';
import './Walkthrough.css';

type Step = {
  dialogue: string;
  highlight: 'old' | 'similar' | 'new' | null;
};

const STEPS: Step[] = [
  { dialogue: "Hi there! Before we start, let me walk you through how this works!", highlight: null },
  { dialogue: "You'll see photos one at a time inside my scrapbook. Decide if you've seen each photo before!", highlight: null },
  { dialogue: "If you've seen the EXACT same photo before, press OLD.", highlight: 'old' },
  { dialogue: "If the photo looks almost the same but has tiny differences, press SIMILAR. These are the tricky ones!", highlight: 'similar' },
  { dialogue: "If you've never seen this photo at all, press NEW.", highlight: 'new' },
  { dialogue: "That's it! Ready to test your memory? Let's go!", highlight: null },
];

const CHOICES = ['Old', 'Similar', 'New'] as const;

interface WalkthroughProps {
  onComplete: () => void;
}

export default function Walkthrough({ onComplete }: WalkthroughProps) {
  const [step, setStep] = useState(0);

  const { dialogue, highlight } = STEPS[step];
  const isFirst = step === 0;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="wt-overlay">
      <div className="wt-card">
        <h2 className="wt-title">How to Play</h2>

        <div className="wt-mock-trial">
          <div className="wt-mock-image">🖼️</div>
          <div className="wt-mock-buttons">
            {CHOICES.map((label) => {
              const isActive = highlight === label.toLowerCase();
              return (
                <button
                  key={label}
                  className={`wt-mock-btn ${isActive ? 'wt-mock-btn--active' : ''}`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="wt-peter-row">
          <div className="wt-bubble">
            <p>{dialogue}</p>
          </div>
          <img src={peterAnteater.src} className="wt-peter-img" alt="Peter" />
        </div>

        <div className="wt-footer">
          <button
            className="wt-btn wt-btn--secondary"
            onClick={() => setStep((s) => s - 1)}
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
            onClick={isLast ? onComplete : () => setStep((s) => s + 1)}
          >
            {isLast ? "Let's Start!" : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  );
}
