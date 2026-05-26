'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function OmstTitlePage({ route = 'omst' }: { route?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [prolificPID, setProlificPID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [studyID, setStudyID] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  
  const parsedAge = Number(age);
  const isAgeValid = Number.isFinite(parsedAge) && parsedAge >= 18;
  const canContinue = isAgeValid && gender.trim() !== '';

  useEffect(() => {
    const urlProlific = searchParams.get('PROLIFIC_PID');
    const urlSession = searchParams.get('SESSION_ID');
    const urlStudy = searchParams.get('STUDY_ID');
    
    if (urlProlific) setProlificPID(urlProlific);
    if (urlSession) setSessionID(urlSession);
    if (urlStudy) setStudyID(urlStudy);
  }, [searchParams]);

  const handleContinue = () => {
    if (!canContinue) {
      return;
    }

    if (!prolificPID || !sessionID) {
      alert('Missing required Prolific parameters (PROLIFIC_PID and SESSION_ID)');
      return;
    }

    window.sessionStorage.setItem(
      'mst_test_demographics',
      JSON.stringify({ participantAge: parsedAge, participantGender: gender })
    );

    const params = new URLSearchParams({
      PROLIFIC_PID: prolificPID,
      SESSION_ID: sessionID,
      STUDY_ID: studyID || 'default_study',
      route: route,
    });
    router.push(`/consent?${params.toString()}`);
  };

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column',
      minHeight: '100vh',
      width: '100%',
      fontFamily: "'Open Sans', 'Arial', sans-serif",
      fontSize: '18px',
      lineHeight: '1.6em',
      backgroundColor: '#fff',
      color: '#333'
    }}>
      <style>{`@import url(https://fonts.googleapis.com/css?family=Open+Sans:400italic,700italic,400,700);`}</style>
      <div style={{
        display: 'flex',
        flex: 1,
        margin: 'auto',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        maxWidth: '500px',
        width: '95%'
      }}>
        <h1 style={{ 
          marginTop: '0', 
          marginBottom: '30px', 
          fontSize: '24px', 
          textAlign: 'center',
          color: '#333'
        }}>
          Please provide your information
        </h1>

        <div style={{ marginBottom: '20px', width: '100%' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '400',
            fontSize: '18px',
            color: '#333'
          }}>
            Age
          </label>
          <input
            type="number"
            min="18"
            step="1"
            placeholder="Must be 18 or older"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: "'Open Sans', 'Arial', sans-serif",
              boxSizing: 'border-box',
              color: '#333'
            }}
          />
        </div>

        <div style={{ marginBottom: '30px', width: '100%' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '400',
            fontSize: '18px',
            color: '#333'
          }}>
            Gender / Sex
          </label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              fontSize: '14px',
              fontFamily: "'Open Sans', 'Arial', sans-serif",
              boxSizing: 'border-box',
              color: '#333'
            }}
          >
            <option value="">Select one</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        <button
          onClick={handleContinue}
          disabled={!canContinue}
          style={{
            display: 'inline-block',
            padding: '6px 12px',
            margin: '0px',
            fontSize: '14px',
            fontWeight: '400',
            fontFamily: "'Open Sans', 'Arial', sans-serif",
            cursor: canContinue ? 'pointer' : 'not-allowed',
            lineHeight: '1.4',
            textAlign: 'center',
            whiteSpace: 'nowrap',
            verticalAlign: 'middle',
            backgroundImage: 'none',
            border: '1px solid #ccc',
            borderRadius: '4px',
            color: canContinue ? '#333' : '#aaa',
            backgroundColor: canContinue ? '#fff' : '#eee',
          }}
          onMouseEnter={(e) => {
            if (canContinue) {
              e.currentTarget.style.backgroundColor = '#ddd';
              e.currentTarget.style.borderColor = '#aaa';
            }
          }}
          onMouseLeave={(e) => {
            if (canContinue) {
              e.currentTarget.style.backgroundColor = '#fff';
              e.currentTarget.style.borderColor = '#ccc';
            }
          }}
        >
          Continue to Consent
        </button>
      </div>
    </div>
  );
}
