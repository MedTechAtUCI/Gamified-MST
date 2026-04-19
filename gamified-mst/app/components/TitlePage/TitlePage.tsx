'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
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
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('test') === 'true';
  
  const [prolificPID, setProlificPID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [studyID, setStudyID] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const parsedAge = Number(age);
  const isAgeValid = Number.isFinite(parsedAge) && parsedAge >= 18;

  const canStart = !isTestMode || (isAgeValid && gender.trim() !== '');

  const handleStartGame = () => {
    if (!canStart) {
      return;
    }

    if (isTestMode) {
      window.sessionStorage.setItem(
        'mst_test_demographics',
        JSON.stringify({ participantAge: parsedAge, participantGender: gender })
      );
    } else {
      window.sessionStorage.removeItem('mst_test_demographics');
    }

    const params = new URLSearchParams({
      PROLIFIC_PID: prolificPID || 'test_user',
      SESSION_ID: sessionID || 'test_session',
      STUDY_ID: studyID || 'test_study',
      mode: 'Imbal2x3',
    });
    router.push(`/consent?${params.toString()}`);
  };

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

      <button className="startButton" onClick={handleStartGame}>
        <img src={startBtn.src} alt="START" />
      </button>

      {isTestMode && (
        <div className="testModeOverlay">
          <div className="testModeModal">
            <h2>Enter Test Credentials</h2>
            
            <div className="testModeFormGroup">
              <label>Prolific PID</label>
              <input
                type="text"
                placeholder="Leave empty for default"
                value={prolificPID}
                onChange={(e) => setProlificPID(e.target.value)}
              />
            </div>

            <div className="testModeFormGroup">
              <label>Session ID</label>
              <input
                type="text"
                placeholder="Leave empty for default"
                value={sessionID}
                onChange={(e) => setSessionID(e.target.value)}
              />
            </div>

            <div className="testModeFormGroup">
              <label>Study ID</label>
              <input
                type="text"
                placeholder="Leave empty for default"
                value={studyID}
                onChange={(e) => setStudyID(e.target.value)}
              />
            </div>

            <div className="testModeFormGroup">
              <label>Age</label>
              <input
                type="number"
                min="18"
                step="1"
                placeholder="Must be 18 or older"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
            </div>

            <div className="testModeFormGroup">
              <label>Gender / sex</label>
              <select value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="">Select one</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button className="testModeSubmitBtn" onClick={handleStartGame} disabled={!canStart}>
              Start Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
