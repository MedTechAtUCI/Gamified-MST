'use client';

import { useCallback, useEffect, useState } from 'react';
import SetupComponent, { Session } from '@/app/setup';
import {
  TaskType,
  JsPsychBundle,
  JsPsychInit,
  RawTrial,
  TrialData,
} from '@/app/types/mst';
import CharacterView from './CharacterView';
import ProgressTimeline from './ProgressTimeline';
import CompletionPanel from './CompletionPanel';
import Walkthrough from '../TitlePage/Walkthrough';
import { useGameState } from '@/app/hooks/useGameState';
import 'jspsych/css/jspsych.css';
import './TaskPage.css';
import { sendMetrics } from '@/app/utils/SendMetrics';
import { fetchUserState, UserState } from '@/app/utils/FetchUserState';

type TaskPageProps = {
  taskType: TaskType;
  prolificPID: string;
  studyID: string;
  sessionID: string;
};

const TaskPage = ({ taskType, prolificPID, studyID, sessionID }: TaskPageProps) => {
  const [trialList, setTrialList] = useState<TrialData[]>([]);
  const [jsPsychPlugins, setJsPsychPlugins] = useState<JsPsychBundle | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [currentSet, setCurrentSet] = useState<number | null>(null);
  const [walkthroughComplete, setWalkthroughComplete] = useState<boolean>(false);
  const [prefetchDone, setPrefetchDone] = useState<boolean>(false);
  const [outfitUnlockNotification, setOutfitUnlockNotification] = useState<{ show: boolean; outfit: number }>({ show: false, outfit: 0 });
  const [completedTrials, setCompletedTrials] = useState(0); // Track completed trials to sync with gamestate
  const [prevOutfitIndex, setPrevOutfitIndex] = useState(-1); // Track previous outfit to detect unlocks
  const [showCompletion, setShowCompletion] = useState<boolean>(false); // Show completion panel at end
  const [userState, setUserState] = useState<UserState | null>(null);
  const [userStateLoading, setUserStateLoading] = useState<boolean>(true);

  /* ---------------- Fetch user state on mount ---------------- */

  useEffect(() => {
    const loadUserState = async () => {
      try {
        const state = await fetchUserState(prolificPID, sessionID);
        setUserState(state);
        if (state?.current_level) {
          setCompletedTrials(state.current_level);
        }
      } catch (error) {
        console.error('Failed to load user state:', error);
      } finally {
        setUserStateLoading(false);
      }
    };

    loadUserState();
  }, [prolificPID, sessionID]);
  const NUM_OUTFITS = 5; // Number of anteater outfit stages
  const gameState = useGameState(trialList.length);

  // Sync completed trials with gamestate
  useEffect(() => {
    gameState.setCurrentLevel(Math.min(completedTrials, trialList.length - 1));
  }, [completedTrials, trialList.length]);

  // Check for outfit unlock when level changes
  useEffect(() => {
    const newOutfitIndex = gameState.getCurrentOutfitIndex(NUM_OUTFITS);
    if (newOutfitIndex > prevOutfitIndex && prevOutfitIndex >= 0) {
      // Delay showing notification until image loading phase (4s after trial starts)
      setTimeout(() => {
        setOutfitUnlockNotification({ show: true, outfit: newOutfitIndex + 1 });
        setTimeout(() => {
          setOutfitUnlockNotification({ show: false, outfit: 0 });
        }, 2000);
      }, 4000);
    }
    setPrevOutfitIndex(newOutfitIndex);
  }, [gameState.currentLevel, prevOutfitIndex]);

  // Save progress to persistent storage whenever trials are completed
  useEffect(() => {
    if (completedTrials > 0 && trialList.length > 0) {
      const levelIndex = Math.min(completedTrials - 1, trialList.length - 1);
    }
  }, [completedTrials, trialList.length]);

  /* ---------------- Load jsPsych plugins ---------------- */

  useEffect(() => {
    (async () => {
      const jspsych = await import('jspsych');
      setJsPsychPlugins({
        initJsPsych: jspsych.initJsPsych,
        preload: (await import('@jspsych/plugin-preload')).default,
        htmlButtonResponse: (await import('@jspsych/plugin-html-button-response')).default,
        imageButtonResponse: (await import('@jspsych/plugin-image-button-response')).default,
      });
    })();
  }, []);

  /* ---------------- Load bins ---------------- */

  const loadBins = useCallback(async (setNumber: number): Promise<number[]> => {
    const fileName = `Set${setNumber}_bins.txt`;
    const encodedFileName = encodeURIComponent(fileName);
    const text = await (await fetch(encodedFileName)).text();
    return text
      .trim()
      .split('\n')
      .map((line) => Number(line.split('\t')[1]));
  }, []);

  /* ---------------- Load task resources ---------------- */

  const loadResources = useCallback(
    async (task: TaskType, savedSet?: number) => {
      try {
        const maxSet = 6;
        const maxShuffle = 2;

        // Use saved set if returning user, otherwise randomize
        const set = savedSet || (Math.floor(Math.random() * maxSet) + 1);
        setCurrentSet(set);

        const loadedBins = await loadBins(set);
        const filePath = `/jsOrders/cMST_${task}_orders_${set}_1_${Math.floor(Math.random() * maxShuffle) + 1}.json`;

        const res = await fetch(filePath);
        const data: RawTrial[] = await res.json();

        const normalized: TrialData[] = data.map((trial, index) => {
          const cleanFileName = trial.image
            .replace(/^Set\s*\d+(_rs)?\//i, '')
            .replace(/\s+/g, '');
          const finalPath = `Set${set}/${cleanFileName}`;

          return {
            ...trial,
            image: finalPath,
            set,
            bin: loadedBins[index],
          };
        });

        /* Testing */

        const params = new URLSearchParams(window.location.search);
        const isTest = params.get('test') === 'true';
        const finalTrialList = isTest ? normalized.slice(0, 5) : normalized;

        /* --------*/

        setTrialList(finalTrialList);
      } catch (e) {
        console.error('Error loading JS orders:', e);
      }
    },
    [loadBins]
  );

  /* ---------------- Start experiment ---------------- */

  const startExperiment = () => {
    const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

    if (!trialList.length || !jsPsychPlugins || !sessionData) return;

    const jsPsych = jsPsychPlugins.initJsPsych({
      display_element: 'jspsych-target',
    } as Parameters<JsPsychInit>[0]);

    const timeline = [
      ...trialList.map((trial) => ({
        type: jsPsychPlugins.imageButtonResponse,
        stimulus: `${CLOUDFRONT_URL}/${encodeURI(trial.image)}`,
        choices: ['Old', 'Similar', 'New'],
        prompt: `<p>Have you seen this before? Is it Old, Similar, or New?</p>`,
        data: trial,
        on_start: () => {
          const target = document.getElementById('jspsych-target');
          if (target) {
            target.classList.remove('jspsych-book--flip');
            void target.offsetWidth;
            target.classList.add('jspsych-book--flip');
            // Lock buttons for 1s
            target.classList.add('jspsych-book--btn-locked');
            setTimeout(() => target.classList.remove('jspsych-book--btn-locked'), 1000);
          }
        },
        on_finish: (data: { response: number; rt: number }) => {
          const labels = ['Old', 'Similar', 'New'];
          const trialRecord = {
            participant_id: sessionData?.sid || 'guest',
            trial_id: trial.trial.toString(),
            image_id: trial.image,
            trial_type: 'image-button-response',
            lure_bin: trial.bin?.toString() || '0',
            participant_response: labels[data.response],
            correct: trial.correct_resp === data.response,
            reaction_time_ms: data.rt || 0,
            timestamp: new Date().toISOString(),
          };

          console.log('Trial completed:', trialRecord);

          // Increment completed trials counter to sync gamestate
          setCompletedTrials((prev) => {
            const newLevel = prev + 1;
            // Save this trial immediately with the new level
            saveTrialData(trialRecord, newLevel);
            return newLevel;
          });
        },
      })),

      {
        type: jsPsychPlugins.htmlButtonResponse,
        stimulus: `<div id="saving-msg"><p>Saving your results, please wait...</p></div>`,
        choices: [],
        on_load: async () => {
          const data = jsPsych.data.get().json();
          await saveData(data);
          const msg = document.getElementById('saving-msg');
          if (msg) msg.style.display = 'none';
          setShowCompletion(true);
          jsPsych.finishTrial();
        }
      },
    ];

    jsPsych.run(timeline);
    setRunning(true);
  };

  /* ---------------- Save data after each trial ---------------- */

  const saveTrialData = async (trialData: any, newLevel?: number) => {
    const AWS_API_GATEWAY = process.env.NEXT_PUBLIC_AWS_METRICS_API;
    
    if (!AWS_API_GATEWAY) {
      console.error('AWS API Gateway URL not configured');
      return;
    }

    try {
      const currentLevel = newLevel ?? gameState.currentLevel;
      const payload = {
        trials: [trialData],
        user_id: prolificPID,
        session_id: sessionID,
        current_level: currentLevel,
        game_week: 1,
        set: currentSet || 1,
      };

      console.log('Saving trial data:', payload);

      const response = await fetch(`${AWS_API_GATEWAY}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      console.log('Trial save response:', response.status);
      if (!response.ok) {
        throw new Error(`Trial save failed: ${response.status}`);
      }
    } catch (e) {
      console.error('Failed to save trial:', e);
    }
  };

  /* ---------------- Save data at end (backup) ---------------- */

  const saveData = async (data: string) => {
    const AWS_API_GATEWAY = process.env.NEXT_PUBLIC_AWS_METRICS_API;
    console.log('Experiment finished. Sending final metrics...');

    try {
      await sendMetrics(
        data, 
        sessionData, 
        AWS_API_GATEWAY || '', 
        {
          prolificPID,
          studyID,
          sessionID,
        },
        gameState.currentLevel,
        1,
        currentSet || 1
      );
      console.log('Final metrics saved.');
    }
    catch (e) {
      console.error('Failed to save final data:', e);
    }
  };

  /* ---------------- Prefetch images during walkthrough ---------------- */

  useEffect(() => {
    if (!trialList.length) return;
    const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

    let settled = 0;
    const total = trialList.length;

    trialList.forEach((t) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        settled++;
        if (settled === total) setPrefetchDone(true);
      };
      img.src = `${CLOUDFRONT_URL}/${encodeURI(t.image)}`;
    });
  }, [trialList]);

  /* ---------------- Auto-load once ready ---------------- */

  useEffect(() => {
    if (ready) {
      loadResources(taskType, userState?.game_set);
    }
  }, [ready, loadResources, taskType, userState?.game_set]);

  useEffect(() => {
    if (ready && walkthroughComplete && prefetchDone && jsPsychPlugins && trialList.length && !running) {
      startExperiment();
    }
  }, [ready, walkthroughComplete, prefetchDone, jsPsychPlugins, trialList, running]);

  /* ---------------- Render ---------------- */

  return (
    <div className="taskPageContainer">
      {!ready && (
        <SetupComponent
          setSessionData={(session) => setSessionData(session)}
          setReadyToStart={(isReady) => setReady(isReady)}
        />
      )}

      {ready && !walkthroughComplete && (
        <Walkthrough onComplete={() => setWalkthroughComplete(true)} />
      )}

      <div className="book-wrapper">
        <CharacterView currentOutfitIndex={gameState.getCurrentOutfitIndex(NUM_OUTFITS)} />
        <div id="jspsych-target" className="jspsych-book"></div>
      </div>

      {ready && walkthroughComplete && (
        <ProgressTimeline
          currentLevel={gameState.currentLevel}
          totalLevels={gameState.totalLevels}
          currentOutfitIndex={gameState.getCurrentOutfitIndex(NUM_OUTFITS)}
          totalOutfits={NUM_OUTFITS}
        />
      )}

      {outfitUnlockNotification.show && (
        <div className="outfit-unlock-banner">
          <p>Outfit {outfitUnlockNotification.outfit} Unlocked!</p>
        </div>
      )}

      <CompletionPanel 
        isVisible={showCompletion} 
        onFinish={() => window.location.href = '/'} 
      />
    </div>
  );
};

export default TaskPage;
