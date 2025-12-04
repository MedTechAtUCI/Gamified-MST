'use client';

import { useEffect, useState } from 'react';

interface InstructionsProps {
  onComplete: () => void;
  language?: string;
}

const Instructions: React.FC<InstructionsProps> = ({ onComplete, language = 'en' }) => {
  const [prompts, setPrompts] = useState<{ [key: string]: string } | null>(null);

  // Load instruction prompts JSON
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        const res = await fetch(`/lang/omst_${language}.json`);
        if (!res.ok) throw new Error("Failed to load prompts");
        const data = await res.json();

        setPrompts(data.instructions);
      }
      catch (e) {
        console.error("Error loading prompts:", e);
      }
    };
    loadPrompts();
  }, [language]);

  if (!prompts) return <p>Loading instructions...</p>;

  return (
    <div>
      ...
    </div>
  )
}

export default Instructions;