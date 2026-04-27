'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import './TitlePage.css';

import PeterDialogue from './PetrDiag';
import mainBg from '../../images/start_screen/backgrounds/start_screen_bg.png';
import mainTitle from '../../images/start_screen/text/main_title.png';
import peterAnteater from '../../images/anteater/peter_anteater.png';
import startBtn from '../../images/start_screen/buttons/start_button.png';

export default function TitlePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('test') === 'true';
  
  const [prolificPID, setProlificPID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [studyID, setStudyID] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [anteaterClicked, setAnteaterClicked] = useState(false);
  const [loadingUserData, setLoadingUserData] = useState(false);
  const [showDemographicsForm, setShowDemographicsForm] = useState(false);
  
  const parsedAge = Number(age);
  const isAgeValid = Number.isFinite(parsedAge) && parsedAge >= 18;
  const canStart = anteaterClicked && isAgeValid && gender.trim() !== '';

  // Load user data if prolific ID is available
  useEffect(() => {
    const loadProvidedParams = () => {
      const urlProlific = searchParams.get('PROLIFIC_PID');
      const urlSession = searchParams.get('SESSION_ID');
      const urlStudy = searchParams.get('STUDY_ID');
      
      if (urlProlific) setProlificPID(urlProlific);
      if (urlSession) setSessionID(urlSession);
      if (urlStudy) setStudyID(urlStudy);
      
      // If prolific ID provided, try to load user data
      // Pass sessionID directly instead of using state (which hasn't updated yet)
      if (urlProlific) {
        loadUserData(urlProlific, urlSession || 'initial');
      } else if (!isTestMode) {
        setShowDemographicsForm(true);
      }
    };
    
    loadProvidedParams();
  }, [searchParams, isTestMode]);

  const loadUserData = async (prolificID: string, sessionID: string) => {
    setLoadingUserData(true);
    try {
      const API_URL = process.env.NEXT_PUBLIC_AWS_METRICS_API;
      if (!API_URL) {
        setShowDemographicsForm(true);
        return;
      }
      
      const url = new URL(`${API_URL}/state`);
      url.searchParams.append('userId', prolificID);
      url.searchParams.append('sessionId', sessionID);
      
      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        if (data.participant_age && data.participant_gender) {
          setAge(String(data.participant_age));
          setGender(data.participant_gender);
          setShowDemographicsForm(false);
        } else {
          setShowDemographicsForm(true);
        }
      } else {
        setShowDemographicsForm(true);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
      setShowDemographicsForm(true);
    } finally {
      setLoadingUserData(false);
    }
  };

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
      window.sessionStorage.setItem(
        'mst_test_demographics',
        JSON.stringify({ participantAge: parsedAge, participantGender: gender })
      );
    }

    const params = new URLSearchParams({
      PROLIFIC_PID: prolificPID || 'test_user',
      SESSION_ID: sessionID || 'test_session',
      STUDY_ID: studyID || 'test_study',
      mode: 'Imbal2x3',
    });
    router.push(`/consent?${params.toString()}`);
  };

  const handleAnteaterClick = () => {
    setAnteaterClicked(true);
  };

  return (
    <div className="scene">
      <img src={mainBg.src} className="bgImage" alt="" />

      <div className="titleContainer">
        <img src={mainTitle.src} className="mainTitle" alt="THE MST" />
      </div>

      <PeterDialogue>
        <div 
          onClick={handleAnteaterClick}
          style={{ cursor: 'pointer', position: 'relative', display: 'inline-block' }}
        >
          <img src={peterAnteater.src} className="petr" alt="Peter" />
        </div>
      </PeterDialogue>

      <button 
        className="startButton" 
        onClick={handleStartGame}
        disabled={!canStart}
        style={{ opacity: canStart ? 1 : 0.5, cursor: canStart ? 'pointer' : 'not-allowed' }}
      >
        <img src={startBtn.src} alt="START" />
      </button>

      {showDemographicsForm && (
        <div className="testModeOverlay">
          <div className="testModeModal">
            <h2>{loadingUserData ? 'Loading your profile...' : 'Please provide your information'}</h2>
            
            {!loadingUserData && (
              <>
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

                <button 
                  className="testModeSubmitBtn" 
                  onClick={() => setShowDemographicsForm(false)}
                  disabled={!isAgeValid || gender.trim() === ''}
                >
                  Continue
                </button>
              </>
            )}
          </div>
        </div>
      )}

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
