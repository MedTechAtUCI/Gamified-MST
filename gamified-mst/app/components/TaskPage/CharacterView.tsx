'use client';
import { useState } from 'react';
import peterAnteater from '../../images/anteater/peter_anteater.png';
import './CharacterView.css';

export default function CharacterView() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Headwear');
  
  const categories = ['Headwear', 'Torso', 'Trousers', 'Shoes', 'Cosmetic'];

  return (
    <>
      <div className="cv-bookmark-tag">
        <button className="cv-tab-btn" onClick={() => setIsOpen(true)}>
          STYLE
        </button>
      </div>

      {isOpen && (
        <div className="cv-overlay">
          <div className="cv-modal">
            <div className="cv-header">
              <h2 className="cv-title">Character Style</h2>
              <button className="cv-close" onClick={() => setIsOpen(false)}>✕</button>
            </div>

            <div className="cv-body">
              <div className="cv-character-panel">
                <div className="cv-peter-frame">
                  <img src={peterAnteater.src} className="cv-peter-img" alt="Peter" />
                </div>
                
                <ul className="cv-wearing-list">
                  {categories.map(cat => (
                    <li key={cat} className="cv-wearing-row">
                      <span className="cv-wearing-slot">{cat}</span>
                      <span className="cv-wearing-none">None</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="cv-inventory-panel">
                <div className="cv-slot-tabs">
                  {categories.map(cat => (
                    <button 
                      key={cat} 
                      className={`cv-slot-tab ${activeTab === cat ? 'cv-slot-tab--active' : ''}`}
                      onClick={() => setActiveTab(cat)}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="cv-item-grid">
                  <div className="cv-empty">No items found for {activeTab}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}