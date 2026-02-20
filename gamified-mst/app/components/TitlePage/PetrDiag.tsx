'use client';

import { useState } from 'react';

const STEPS = [
  "Hey, I'm Peter! Welcome to my game, Peter's Adventure!",
  "I'll show you some photos from my latest trip. If you've seen one already, mark it 'Old' - If it's brand new, mark it 'New'!",
  "Watch out for tricks! If a picture looks almost the same but has tiny changes, mark it 'Similar.'",
  "Ready to test your memory? Click 'START' and let's get exploring!"
];
export default function PeterDialogue({ children }: { children: React.ReactNode }) {
  const [index, setIndex] = useState(-1);

  const next = () => setIndex((prev) => (prev < STEPS.length - 1 ? prev + 1 : -1));

  return (
    <div className="anteaterWrapper" onClick={next}>
      {index >= 0 && (
        <div className="dialogueBox">
          <p>{STEPS[index]}</p>
          <div className="pageIndicator">{index + 1} / {STEPS.length}</div>
          <div className="dialogueArrow"></div>
        </div>
      )}
      {children}
    </div>
  );
}