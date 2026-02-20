'use client';

import { useRouter } from 'next/navigation';
import './TitlePage.css';

import PeterDialogue from './PetrDiag';
import mainBg from '../../images/start_screen/backgrounds/start_screen_bg.png';
import mainTitle from '../../images/start_screen/text/main_title.png';
import peterAnteater from '../../images/anteater/peter_anteater.png';
import startBtn from '../../images/start_screen/buttons/start_button.png';
import settingsBtn from '../../images/start_screen/buttons/settings_button.png';
import soundOnBtn from '../../images/start_screen/buttons/sound_on_button.png';

export default function TitlePage() {
  const router = useRouter();

return (
    <div className="scene">
      <img src={mainBg.src} className="bgImage" alt="" />

      <div className="controls">
        <button className="iconBtn"><img src={settingsBtn.src} alt="Settings" /></button>
        <button className="iconBtn"><img src={soundOnBtn.src} alt="Sound" /></button>
      </div>

      <div className="titleContainer">
        <img src={mainTitle.src} className="mainTitle" alt="THE MST" />
      </div>

      <PeterDialogue>
        <img src={peterAnteater.src} className="petr" alt="Peter" />
      </PeterDialogue>

      <button className="startButton" onClick={() => router.push('/task?mode=Flatx2&test=true')}>
        <img src={startBtn.src} alt="START" />
      </button>
    </div>
  );
}
