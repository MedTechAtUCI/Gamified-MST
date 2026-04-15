'use client';

import { useState, useEffect } from 'react';
import peterAnteater from '../../images/anteater/peter_anteater.png';
import './CompletionPanel.css';

interface CompletionPanelProps {
  isVisible: boolean;
  onFinish: () => void;
}

export default function CompletionPanel({ isVisible, onFinish }: CompletionPanelProps) {
  const [showPanel, setShowPanel] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowPanel(true);
    }
  }, [isVisible]);

  if (!showPanel) return null;

  return (
    <>
      <div className="cp-overlay" onClick={(e) => e.target === e.currentTarget && onFinish()}>
        <div className="cp-modal">
          <div className="cp-header">
            <h2 className="cp-title">🎉 You Did It!</h2>
          </div>

          <div className="cp-content">
            <div className="cp-peter-section">
              <img src={peterAnteater.src} alt="Peter Anteater" className="cp-peter-img" />
              <div className="cp-message">
                <p className="cp-main-text">
                  Congratulations on completing the task! Your results have been saved.
                </p>
                <p className="cp-secondary-text">
                  Thank you for participating in the study.
                </p>
              </div>
            </div>
          </div>

          <div className="cp-footer">
            <button className="cp-btn cp-btn--primary" onClick={onFinish}>
              Return to Home
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
