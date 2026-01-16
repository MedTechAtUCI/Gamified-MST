'use client';

import { useRouter } from 'next/navigation';
import './title.css';

export default function Page() {
  const router = useRouter();

  return (
    <div className="scene">
      {/* Sun */}
      <div className="sun" />

      {/* Clouds */}
      <div className="cloud cloud1" />
      <div className="cloud cloud2" />

      {/* Title */}
      <div className="titleBox">
        <div className="titleText">THE MST</div>
      </div>

      {/* Start Button */}
      <button
        className="startButton"
        onClick={() => router.push('/task?mode=Flatx2')}
      >
        START
      </button>

      {/* Ground */}
      <div className="ground">
        {/* Tree */}
        <div className="tree">
          <div className="leaves" />
          <div className="trunk" />
        </div>

        {/* Anteater placeholder */}
        <div className="anteater" />
      </div>
    </div>
  );
}
