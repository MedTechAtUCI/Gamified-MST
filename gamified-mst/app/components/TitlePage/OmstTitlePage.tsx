'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useCallback } from 'react';

// Default test values — valid for all required demographic fields
const TEST_DEFAULTS = {
  age: '25',
  gender: 'male',
  ethnicity: 'nonhispanic',
  race: 'White',
  handedness: 'right',
  education: '16',
  colorblindness: 'no',
};

export default function OmstTitlePage({ route = 'omst' }: { route?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isTestMode = searchParams.get('test') === 'true';
  
  const [prolificPID, setProlificPID] = useState('');
  const [sessionID, setSessionID] = useState('');
  const [studyID, setStudyID] = useState('');

  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [ethnicity, setEthnicity] = useState('');
  const [race, setRace] = useState('');
  const [handedness, setHandedness] = useState('');
  const [education, setEducation] = useState('');
  const [colorblindness, setColorblindness] = useState('');

  const isAgeValid = Number(age) >= 18;
  const parsedEducation = Number(education);
  const isEducationValid = education.trim() !== '' && Number.isFinite(parsedEducation) && parsedEducation >= 0;
  const canContinue = isAgeValid && gender && ethnicity && race && handedness && isEducationValid && colorblindness;

  useEffect(() => {
    if (isTestMode) {
      // In test mode: generate test-{timestamp} IDs and pre-fill demographics
      const ts = Date.now();
      setProlificPID(`test-${ts}`);
      setSessionID(`test-${ts}`);
      setStudyID(`test-${ts}`);
      setAge(TEST_DEFAULTS.age);
      setGender(TEST_DEFAULTS.gender);
      setEthnicity(TEST_DEFAULTS.ethnicity);
      setRace(TEST_DEFAULTS.race);
      setHandedness(TEST_DEFAULTS.handedness);
      setEducation(TEST_DEFAULTS.education);
      setColorblindness(TEST_DEFAULTS.colorblindness);
    } else {
      setProlificPID(searchParams.get('PROLIFIC_PID') || '');
      setSessionID(searchParams.get('SESSION_ID') || '');
      setStudyID(searchParams.get('STUDY_ID') || '');
    }
  }, [searchParams, isTestMode]);

  const handleContinue = () => {
    if (!canContinue) return;

    // In test mode, IDs are already auto-generated; skip the Prolific param guard
    if (!isTestMode && (!prolificPID || !sessionID)) {
      alert('Missing required Prolific parameters (PROLIFIC_PID and SESSION_ID)');
      return;
    }

    // Save to sessionStorage for cont_omst.html to pick up later
    window.sessionStorage.setItem(
      'mst_test_demographics',
      JSON.stringify({ 
        participantAge: Number(age), 
        participantGender: gender,
        participantEthnicity: ethnicity,
        participantRace: race,
        participantHandedness: handedness,
        participantEducation: parsedEducation,
        participantColorblindness: colorblindness
      })
    );

    const params = new URLSearchParams({
      PROLIFIC_PID: prolificPID,
      SESSION_ID: sessionID,
      STUDY_ID: studyID || 'default_study',
      route: route,
      ...(isTestMode ? { test: 'true' } : {}),
    });
    router.push(`/consent?${params.toString()}`);
  };

  // Allow Enter key to continue when all required fields are filled
  const onEnterPress = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (isAgeValid && gender && ethnicity && race && handedness && isEducationValid && colorblindness) {
        handleContinue();
      }
    }
  }, [isAgeValid, gender, ethnicity, race, handedness, isEducationValid, colorblindness, handleContinue]);

  useEffect(() => {
    window.addEventListener('keydown', onEnterPress);
    return () => window.removeEventListener('keydown', onEnterPress);
  }, [onEnterPress]);

  const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '700', fontSize: '18px' };
  const radioContainerStyle = { marginLeft: '20px', marginBottom: '15px', textAlign: 'left' as const };
  const radioLabelStyle = { marginLeft: '10px', fontSize: '16px', fontWeight: '400' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', width: '100%', fontFamily: "'Open Sans', sans-serif", backgroundColor: '#fff', color: '#333' }}>
      {isTestMode && (
        <div style={{ background: '#5d3a1a', color: '#f4ede4', textAlign: 'center', padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, letterSpacing: '0.5px' }}>
          🧪 Test Mode — IDs auto-generated as <code style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 5px', borderRadius: 4 }}>test-{'{timestamp}'}</code> — fields pre-filled with valid defaults
        </div>
      )}
      <div style={{ flex: 1, margin: '20px auto', padding: '20px 20px 140px', maxWidth: '720px', width: '95%', overflowY: 'auto', WebkitOverflowScrolling: 'touch', boxSizing: 'border-box', maxHeight: 'calc(100vh - 80px)' }}>
        <div style={{ textAlign: 'center', marginBottom: '18px' }}>
          <h1 style={{ fontSize: '28px', margin: 0 }}>Demographic Information</h1>
        </div>
        <div style={{ fontSize: '16px', lineHeight: 1.4, marginBottom: '20px', textAlign: 'left' }}>
          <div style={{ fontSize: '18px', marginBottom: '12px', fontWeight: 600 }}>The National Institute of Health (NIH) mandates that we collect demographic information from participants and that we collect it in this specific format.</div>
        </div>

        {/* AGE */}
        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>Age:</label>
          <input
            type="number"
            min={0}
            value={age}
            onChange={(e) => setAge(e.target.value)}
            placeholder="Enter your age"
            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
          {!isAgeValid && age !== '' && (<div style={{ color: '#b00', marginTop: 8 }}>You must be 18 or older to participate.</div>)}
        </div>

        {/* GENDER */}
        <div style={radioContainerStyle}>
          <label style={labelStyle}>Gender:</label>
          <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={(e) => setGender(e.target.value)} /> <span style={radioLabelStyle}>Male</span><br/>
          <input type="radio" name="gender" value="female" checked={gender === 'female'} onChange={(e) => setGender(e.target.value)} /> <span style={radioLabelStyle}>Female</span>
        </div>

        {/* ETHNICITY */}
        <div style={radioContainerStyle}>
          <label style={labelStyle}>Ethnicity:</label>
          <input type="radio" name="ethnicity" value="hispanic" checked={ethnicity === 'hispanic'} onChange={(e) => setEthnicity(e.target.value)} /> <span style={radioLabelStyle}>Hispanic or Latino</span><br/>
          <input type="radio" name="ethnicity" value="nonhispanic" checked={ethnicity === 'nonhispanic'} onChange={(e) => setEthnicity(e.target.value)} /> <span style={radioLabelStyle}>Not Hispanic or Latino</span>
        </div>

        {/* RACE */}
        <div style={radioContainerStyle}>
          <label style={labelStyle}>Race (select one):</label>
          {[
            'American Indian or Alaska Native',
            'Asian',
            'Native Hawaiian or Pacific Islander',
            'Black or African American',
            'White',
            'More than one race or Other'
          ].map((r, i) => (
            <div key={i}>
              <input type="radio" name="race" value={r} checked={race === r} onChange={(e) => setRace(e.target.value)} />
              <span style={radioLabelStyle}>{r}</span>
            </div>
          ))}
        </div>

        {/* HANDEDNESS */}
        <div style={radioContainerStyle}>
          <label style={labelStyle}>Handedness:</label>
          <input type="radio" name="hand" value="left" checked={handedness === 'left'} onChange={(e) => setHandedness(e.target.value)} /> <span style={radioLabelStyle}>Left</span><br/>
          <input type="radio" name="hand" value="right" checked={handedness === 'right'} onChange={(e) => setHandedness(e.target.value)} /> <span style={radioLabelStyle}>Right</span><br/>
          <input type="radio" name="hand" value="ambi" checked={handedness === 'ambi'} onChange={(e) => setHandedness(e.target.value)} /> <span style={radioLabelStyle}>Ambidextrous</span>
        </div>

        {/* EDUCATION */}
        <div style={{ marginBottom: '18px' }}>
          <label style={labelStyle}>Years of education:</label>
          <input
            type="number"
            min={0}
            value={education}
            onChange={(e) => setEducation(e.target.value)}
            placeholder="Enter years of education (e.g. 12, 16)"
            style={{ width: '100%', padding: '12px', borderRadius: '4px', border: '1px solid #ccc', fontSize: '16px' }}
          />
        </div>

        {/* COLORBLINDNESS */}
        <div style={radioContainerStyle}>
          <label style={labelStyle}>Colorblindness:</label>
          <input type="radio" name="colorblindness" value="no" checked={colorblindness === 'no'} onChange={(e) => setColorblindness(e.target.value)} /> <span style={radioLabelStyle}>No</span><br/>
          <input type="radio" name="colorblindness" value="yes" checked={colorblindness === 'yes'} onChange={(e) => setColorblindness(e.target.value)} /> <span style={radioLabelStyle}>Yes</span><br/>
          <input type="radio" name="colorblindness" value="unsure" checked={colorblindness === 'unsure'} onChange={(e) => setColorblindness(e.target.value)} /> <span style={radioLabelStyle}>Unsure</span>
        </div>


        {/* Fixed footer button to ensure visibility on small screens */}
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 0, background: '#fff', borderTop: '1px solid #eee', padding: '12px 16px', display: 'flex', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ width: '100%', maxWidth: 720, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 14, color: '#555' }}>
              {isAgeValid ? '' : 'Age (18+) required • '}
              {gender ? '' : 'Gender required • '}
              {ethnicity ? '' : 'Ethnicity required • '}
              {race ? '' : 'Race required • '}
              {handedness ? '' : 'Handedness required • '}
              {isEducationValid ? '' : 'Education required • '}
              {colorblindness ? '' : 'Colorblindness required'}
            </div>
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              style={{
                padding: '10px 18px',
                fontSize: '16px',
                cursor: canContinue ? 'pointer' : 'not-allowed',
                backgroundColor: canContinue ? '#0366d6' : '#e9ecef',
                border: '1px solid ' + (canContinue ? '#0366d6' : '#ddd'),
                borderRadius: '6px',
                color: canContinue ? '#fff' : '#777',
                fontWeight: 700
              }}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

