'use client';

import { useState } from 'react';

const STEPS = [
  "Zot Zot Zot! I'm Peter! I just got back from a huge trip!",
  "I took a bunch of photos, but I think some might be duplicates... or even fakes!",
  "Think you could help me sort them out?",
  "Click that 'START GAME' button and let's get exploring!"
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