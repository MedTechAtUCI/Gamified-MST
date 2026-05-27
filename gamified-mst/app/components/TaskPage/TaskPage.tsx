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
import { sendMetrics } from '@/app/utils/SendMetrics';
import { fetchUserState, UserState } from '@/app/utils/FetchUserState';
import { getSessionSet, getNextSet, isSessionCompleted, areAllSetsCompleted } from '@/app/utils/SetAssignment';

import './TaskPage.css';

type TaskPageProps = {
  taskType: TaskType;
  prolificPID: string;
  studyID: string;
  sessionID: string;
  participantAge?: number;
  participantGender?: string;
  participantEthnicity?: string;
  participantRace?: string;
  participantHandedness?: string;
  gameSet?: number;
  gameWeek?: number;
};

const TaskPage = ({ taskType, prolificPID, studyID, sessionID, participantAge, participantGender, participantEthnicity, participantRace, participantHandedness, gameSet: propGameSet, gameWeek: propGameWeek }: TaskPageProps) => {
  // Age validation check - must be 18 or older
  useEffect(() => {
    if (typeof participantAge !== 'undefined' && participantAge < 18) {
      const noConsentUrl = process.env.NEXT_PUBLIC_PROLIFIC_NO_CONSENT || 'https://app.prolific.com/submissions/complete';
      window.location.href = noConsentUrl;
    }
  }, [participantAge]);

  // Calculate game week from completed sessions (week = completed sessions count + 1)
  const getGameWeek = (userState: UserState | null | undefined): number => {
    if (!userState?.sessions) return 1;
    const completedCount = userState.sessions.filter((s) => s.completed).length;
    return completedCount + 1;
  };

  // Get fresh game week by refetching user state
  const getGameWeekFresh = async (): Promise<number> => {
    try {
      const fresh = await fetchUserState(prolificPID, sessionID);
      return getGameWeek(fresh);
    } catch (e) {
      console.warn('Could not fetch fresh game week, returning 1:', e);
      return 1;
    }
  };

  const [trialList, setTrialList] = useState<TrialData[]>([]);
  const [jsPsychPlugins, setJsPsychPlugins] = useState<JsPsychBundle | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [currentSet, setCurrentSet] = useState<number | null>(null);
  const [walkthroughComplete, setWalkthroughComplete] = useState<boolean>(false);
  const [prefetchDone, setPrefetchDone] = useState<boolean>(false);
  // const [outfitUnlockNotification, setOutfitUnlockNotification] = useState<{ show: boolean; outfit: number }>({ show: false, outfit: 0 });
  const [completedTrials, setCompletedTrials] = useState(0); // Track completed trials to sync with gamestate
  const [prevOutfitIndex, setPrevOutfitIndex] = useState(-1); // Track previous outfit to detect unlocks
  const [showCompletion, setShowCompletion] = useState<boolean>(false); // Show completion panel at end
  const [allSetsCompleted, setAllSetsCompleted] = useState<boolean>(false); // All 6 sets completed
  const [userState, setUserState] = useState<UserState | null>(null);
  const [userStateLoading, setUserStateLoading] = useState<boolean>(true);
  const [screenSize, setScreenSize] = useState<string>('');
  const [deviceType, setDeviceType] = useState<string>('');

  /* ---------------- Detect screen size and device type on mount ---------------- */

  useEffect(() => {
    const getDeviceInfo = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const size = `${width}x${height}`;
      setScreenSize(size);
      
      // Determine device type based on screen width
      let type = 'desktop';
      if (width < 768) type = 'mobile';
      else if (width < 1024) type = 'tablet';
      setDeviceType(type);
    };
    
    getDeviceInfo();
    window.addEventListener('resize', getDeviceInfo);
    return () => window.removeEventListener('resize', getDeviceInfo);
  }, []);

  /* ---------------- Fetch user state on mount ---------------- */

  useEffect(() => {
    const loadUserState = async () => {
      try {
        const state = await fetchUserState(prolificPID, sessionID);
        setUserState(state);
        if (state?.current_level !== undefined && state.current_level > 0) {
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
  // NOTE: Outfit notifications disabled - progress timeline shows outfit progress visually
  // Notifications during trials were found to be distracting per participant feedback
  useEffect(() => {
    const newOutfitIndex = gameState.getCurrentOutfitIndex(NUM_OUTFITS);
    setPrevOutfitIndex(newOutfitIndex);
    // Uncomment below to re-enable outfit unlock notifications during trials
    // if (newOutfitIndex > prevOutfitIndex && prevOutfitIndex >= 0) {
    //   setTimeout(() => {
    //     setOutfitUnlockNotification({ show: true, outfit: newOutfitIndex + 1 });
    //     setTimeout(() => {
    //       setOutfitUnlockNotification({ show: false, outfit: 0 });
    //     }, 2000);
    //   }, 4000);
    // }
  }, [gameState.currentLevel, prevOutfitIndex]);

  // Save progress to persistent storage whenever trials are completed
  useEffect(() => {
    if (completedTrials > 0 && trialList.length > 0) {
      const levelIndex = Math.min(completedTrials - 1, trialList.length - 1);
    }
  }, [completedTrials, trialList.length]);

  // Check if user has already completed all trials - if so, auto-show completion
  useEffect(() => {
    if (trialList.length > 0 && completedTrials >= trialList.length && ready && walkthroughComplete) {
      setShowCompletion(true);
    }
  }, [completedTrials, trialList.length, ready, walkthroughComplete]);

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
    // Bins are now loaded from the JSON file itself (lbin field), so we return empty array
    // The actual bins will be assigned from trial.lbin in loadResources
    return [];
  }, []);

  /* ---------------- Load task resources ---------------- */

  const loadResources = useCallback(
    async (task: TaskType, userStateData?: UserState | null | undefined) => {
      try {
        // Refetch fresh user state to ensure we have latest session data
        let freshUserState = userStateData;
        try {
          const latest = await fetchUserState(prolificPID, sessionID);
          if (latest) {
            freshUserState = latest;
            setUserState(latest);
          }
        } catch (e) {
          console.warn('Could not refetch user state, using cached:', e);
        }

        // Check if all sets are completed
        if (areAllSetsCompleted(freshUserState)) {
          setAllSetsCompleted(true);
          setShowCompletion(true);
          return;
        }

        // Check if this session already has an assigned set
        let set = getSessionSet(freshUserState, sessionID);
        
        // If not assigned, get next available set
        if (!set) {
          if (freshUserState?.game_set) {
            set = freshUserState.game_set;
          }
          else {
            set = getNextSet(freshUserState) || propGameSet || 1;
          }
        }

        // If still no set, default to 1
        if (!set) {
          set = 1;
        }
        
        console.log('Loading task with set:', set, 'task:', task, 'filePath will be:', `/jsOrders/cMST_${task}_orders_${set}_1_1.json`);
        
        setCurrentSet(set);

        const loadedBins = await loadBins(set);
        const filePath = `/jsOrders/cMST_${task}_orders_${set}_1_1.json`;

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
            bin: ((trial as any).lbin ?? loadedBins[index] ?? 0) as number,
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
    [loadBins, sessionID]
  );

  /* ---------------- Start experiment ---------------- */

  const startExperiment = () => {
    const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    
    if (!CLOUDFRONT_URL) {
      console.error('NEXT_PUBLIC_CLOUDFRONT_URL is not configured');
      alert('Configuration error: CloudFront URL not set. Please check environment variables.');
      return;
    }

    if (!trialList.length || !jsPsychPlugins || !sessionData) return;

    const jsPsych = jsPsychPlugins.initJsPsych({
      display_element: 'jspsych-target',
    } as Parameters<JsPsychInit>[0]);

    // Only run remaining trials (skip already completed)
    const remainingTrials = trialList.slice(completedTrials);

    const timeline = [
      ...remainingTrials.map((trial) => ({
        type: jsPsychPlugins.imageButtonResponse,
        stimulus: `${CLOUDFRONT_URL}/${encodeURI(trial.image)}`,
        choices: ['Old', 'Similar', 'New'],
        prompt: `<p>Have you seen this before? Is it Old, Similar, or New?</p>`,
        // Explicitly pass trial properties so they're included in jsPsych output
        data: {
          ...trial,
          mst_type: trial.type,  // Alias for compatibility
        },
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

          // Verify image loaded successfully by checking actual img element
          const imgElement = target?.querySelector('img.jspsych-image') as HTMLImageElement;
          if (imgElement && !imgElement.complete) {
            // Image still loading, set up error handler
            imgElement.onerror = () => {
              console.error(`Image failed to load: ${trial.image}`);
              const prompt = target?.querySelector('.jspsych-prompt');
              if (prompt) {
                prompt.innerHTML = '<p style="color: red;">⚠️ Image failed to load. Please refresh the page and try again.</p>';
              }
            };
          }
        },
        on_finish: (data: any) => {
          const labels = ['Old', 'Similar', 'New'];
          
          // Extract mst_type from multiple possible locations
          let mstType = data.mst_type ?? data.type ?? trial.type;
          
          const trialRecord = {
            participant_id: sessionData?.sid || 'guest',
            trial_id: trial.trial.toString(),
            image_id: trial.image,
            trial_type: 'image-button-response',
            mst_type: mstType,
            lag: data.lag ?? (trial as any).lag,
            lure_bin: (trial.bin ?? 0).toString(),
            participant_response: labels[data.response],
            correct_resp: trial.correct_resp,
            correct: trial.correct_resp === data.response,
            reaction_time_ms: data.rt || 0,
            timestamp: new Date().toISOString(),
          };

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
      const currentGameWeek = await getGameWeekFresh();
      const payload = {
        trials: [trialData],
        user_id: prolificPID,
        session_id: sessionID,
        current_level: currentLevel,
        game_week: currentGameWeek,
        game_type: 'G',
        set: currentSet || 1,
        ...(typeof participantAge !== 'undefined' ? { participant_age: participantAge } : {}),
        ...(participantGender ? { participant_gender: participantGender } : {}),
        ...(participantEthnicity ? { participant_ethnicity: participantEthnicity } : {}),
        ...(participantRace ? { participant_race: participantRace } : {}),
        ...(participantHandedness ? { participant_handedness: participantHandedness } : {}),
        ...(screenSize ? { screen_size: screenSize } : {}),
        ...(deviceType ? { device_type: deviceType } : {}),
      };

      const response = await fetch(`${AWS_API_GATEWAY}/metrics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
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
    try {
      const freshGameWeek = await getGameWeekFresh();
      await sendMetrics(
        data, 
        sessionData, 
        AWS_API_GATEWAY || '', 
        {
          prolificPID,
          studyID,
          sessionID,
          participantAge,
          participantGender,
          participantEthnicity,
          participantRace,
          participantHandedness,
          screenSize,
          deviceType,
        },
        gameState.currentLevel,
        freshGameWeek,
        currentSet || 1,
        true, // session_completed: mark this session as complete
        'G'
      );
    }
    catch (e) {
      console.error('Failed to save final data:', e);
    }
  };

  /* ---------------- Prefetch images during walkthrough with retry logic ---------------- */

  useEffect(() => {
    if (!trialList.length) return;
    const CLOUDFRONT_URL = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    
    if (!CLOUDFRONT_URL) {
      console.warn('NEXT_PUBLIC_CLOUDFRONT_URL not set, skipping prefetch');
      setPrefetchDone(true);
      return;
    }

    let settled = 0;
    const failedImages = new Map<string, number>(); // Track retry count per image
    const total = trialList.length;
    const MAX_RETRIES = 2;

    const attemptLoad = (trial: TrialData, retryCount = 0) => {
      const img = new Image();
      const imageUrl = `${CLOUDFRONT_URL}/${encodeURI(trial.image)}`;
      
      img.onload = () => {
        settled++;
        failedImages.delete(trial.image);
        if (settled >= total) setPrefetchDone(true);
      };
      
      img.onerror = () => {
        const currentRetries = failedImages.get(trial.image) || 0;
        
        if (currentRetries < MAX_RETRIES) {
          // Retry after short delay
          failedImages.set(trial.image, currentRetries + 1);
          console.warn(`Retrying image (${currentRetries + 1}/${MAX_RETRIES}): ${trial.image}`);
          setTimeout(() => attemptLoad(trial, currentRetries + 1), 500);
        } else {
          // Final failure - log but continue
          console.error(`Failed to prefetch after ${MAX_RETRIES} retries: ${trial.image}`);
          settled++;
          if (settled >= total) setPrefetchDone(true);
        }
      };
      
      img.src = imageUrl;
    };

    trialList.forEach((trial) => attemptLoad(trial));
  }, [trialList]);

  /* ---------------- Auto-load once ready AND user state is loaded ---------------- */

  useEffect(() => {
    if (ready && !userStateLoading) {
      loadResources(taskType, userState);
    }
  }, [ready, userStateLoading, loadResources, taskType]);

  useEffect(() => {
    if (ready && walkthroughComplete && prefetchDone && jsPsychPlugins && trialList.length && !running && completedTrials < trialList.length && !allSetsCompleted) {
      startExperiment();
    }
  }, [ready, walkthroughComplete, prefetchDone, jsPsychPlugins, trialList, running, completedTrials, allSetsCompleted]);

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

      {/* {outfitUnlockNotification.show && (
        <div className="outfit-unlock-banner">
          <p>Outfit {outfitUnlockNotification.outfit} Unlocked!</p>
        </div>
      )} */}

      <CompletionPanel 
        isVisible={showCompletion} 
        onFinish={() => {
          const prolificComplete = process.env.NEXT_PUBLIC_PROLIFIC_COMPLETE_STUDY || 'https://app.prolific.com/submissions/complete';
          window.location.href = prolificComplete;
        }} 
      />
    </div>
  );
};

export default TaskPage;
