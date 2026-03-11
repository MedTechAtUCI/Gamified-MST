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
import Walkthrough from '../TitlePage/Walkthrough';

import 'jspsych/css/jspsych.css';
import './TaskPage.css';
import { sendMetrics } from '@/app/utils/SendMetrics';

type TaskPageProps = {
  taskType: TaskType;
};

const TaskPage = ({ taskType }: TaskPageProps) => {
  const [trialList, setTrialList] = useState<TrialData[]>([]);
  const [jsPsychPlugins, setJsPsychPlugins] = useState<JsPsychBundle | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [currentSet, setCurrentSet] = useState<number | null>(null);
  const [walkthroughComplete, setWalkthroughComplete] = useState<boolean>(false);
  const [prefetchDone, setPrefetchDone] = useState<boolean>(false);

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
    async (task: TaskType) => {
      try {
        const maxSet = 6;
        const maxShuffle = 2;

        const set = Math.floor(Math.random() * maxSet) + 1;
        const shuffle = Math.floor(Math.random() * maxShuffle) + 1;
        setCurrentSet(set);

        const loadedBins = await loadBins(set);
        const filePath = `/jsOrders/cMST_${task}_orders_${set}_1_${shuffle}.json`;

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
    const IMAGE_S3_BUCKET = process.env.NEXT_PUBLIC_AWS_S3_BUCKET;

    if (!trialList.length || !jsPsychPlugins || !sessionData) return;

    const jsPsych = jsPsychPlugins.initJsPsych({
      display_element: 'jspsych-target',
    } as Parameters<JsPsychInit>[0]);

    const timeline = [
      ...trialList.map((trial) => ({
        type: jsPsychPlugins.imageButtonResponse,
        stimulus: `${IMAGE_S3_BUCKET}/${encodeURI(trial.image)}`,
        choices: ['Old', 'Similar', 'New'],
        prompt: `<p>Have you seen this before? Is it Old, Similar, or New?</p>`,
        data: trial,
        on_start: () => {
          const target = document.getElementById('jspsych-target');
          if (target) {
            target.classList.remove('jspsych-book--flip');
            void target.offsetWidth;
            target.classList.add('jspsych-book--flip');
            // Lock buttons: 0.5s flip delay + 1s fade-in + 2s hold + 0.5s fade-out = 4s
            target.classList.add('jspsych-book--btn-locked');
            setTimeout(() => target.classList.remove('jspsych-book--btn-locked'), 4000);
          }
        },
        on_finish: (data: { response: number }) => {
          const labels = ['Old', 'Similar', 'New'];
          console.log({
            trial: trial.trial,
            image: trial.image,
            correctResponse: labels[trial.correct_resp],
            userResponse: labels[data.response],
            isCorrect: trial.correct_resp === data.response,
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
          jsPsych.finishTrial();
        }
      },

      {
        type: jsPsychPlugins.htmlButtonResponse,
        stimulus: `<p>Thank you for completing the task. You can now return to the home page.</p>`,
        choices: ['Finish'],
        on_finish: () => {
          window.location.href = '/';
        }
      },
    ];

    jsPsych.run(timeline);
    setRunning(true);
  };

  /* ---------------- Save data ---------------- */

  const saveData = async (data: string) => {
    const AWS_API_GATEWAY = process.env.NEXT_PUBLIC_AWS_METRICS_API;
    console.log('Experiment finished. Sending metrics...');

    try {
      await sendMetrics(data, sessionData, AWS_API_GATEWAY || '');
      console.log('Metrics saved.');
    }
    catch (e) {
      console.error('Failed to save data:', e);
    }
  };

  /* ---------------- Prefetch images during walkthrough ---------------- */

  useEffect(() => {
    if (!trialList.length) return;
    const IMAGE_S3_BUCKET = process.env.NEXT_PUBLIC_AWS_S3_BUCKET;

    let settled = 0;
    const total = trialList.length;

    trialList.forEach((t) => {
      const img = new Image();
      img.onload = img.onerror = () => {
        settled++;
        if (settled === total) setPrefetchDone(true);
      };
      img.src = `${IMAGE_S3_BUCKET}/${encodeURI(t.image)}`;
    });
  }, [trialList]);

  /* ---------------- Auto-load once ready ---------------- */

  useEffect(() => {
    if (ready) {
      loadResources(taskType);
    }
  }, [ready, loadResources, taskType]);

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
        <CharacterView />
        <div id="jspsych-target" className="jspsych-book"></div>
      </div>
    </div>
  );
};

export default TaskPage;
