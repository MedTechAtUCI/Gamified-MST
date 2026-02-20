'use client';
import { useState } from 'react';
import peterAnteater from '../../images/anteater/peter_anteater.png';

export default function CharacterView() {
  const [isOpen, setIsOpen] = useState(false);
  const categories = ['Headwear', 'Torso', 'Trousers', 'Shoes', 'Cosmetic'];

  return (
    <div className={`style-bookmark ${isOpen ? 'open' : ''}`}>
      <button className="style-tab" onClick={() => setIsOpen(!isOpen)}>
        STYLE
      </button>

      <div className="style-content">
        <div className="peter-zone">
          <div className="fashion-bubble">
            <p> Hmm, what should I wear for our next adventure? </p>
            <div className="bubble-arrow" />
          </div>
          <img src={peterAnteater.src} className="petr-shuffle" alt="Peter" />
        </div>

        <div className="cat-list">
          {categories.map(cat => (
            <div key={cat} className="cat-row">
              <span className="cat-name">{cat}</span>
              <div className="slot-box">+</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}