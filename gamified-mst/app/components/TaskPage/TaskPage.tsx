'use client';

import { useCallback, useEffect, useState } from "react";
import SetupComponent, { Session } from "@/app/setup";
import {
  TaskType,
  JsPsychBundle,
  JsPsychInit,
  RawTrial,
  TrialData,
} from "@/app/types/mst";

import 'jspsych/css/jspsych.css';
import './TaskPage.css';

const TaskPage = () => {
  const [trialList, setTrialList] = useState<TrialData[]>([]);
  const [jsPsychPlugins, setJsPsychPlugins] = useState<JsPsychBundle | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  const [running, setRunning] = useState<boolean>(false);
  const [currentSet, setCurrentSet] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const jspsych = await import("jspsych");
      setJsPsychPlugins({
        initJsPsych: jspsych.initJsPsych,
        preload: (await import("@jspsych/plugin-preload")).default,
        htmlButtonResponse: (await import("@jspsych/plugin-html-button-response")).default,
        imageButtonResponse: (await import("@jspsych/plugin-image-button-response")).default,
      });
    })();
  }, []);

  const loadBins = useCallback(async (setNumber: number): Promise<number[]> => {
    const fileName = `Set${setNumber}_bins.txt`;
    const encodedFileName = encodeURIComponent(fileName);
    const text = await (await fetch(encodedFileName)).text();
    return text.trim().split('\n').map((line) => Number(line.split('\t')[1]));
  }, []);

  const loadResources = useCallback(async (taskType: TaskType) => {
    try {
      const maxSet = 6;
      const maxShuffle = 2;

      const set = Math.floor(Math.random() * maxSet) + 1;
      const shuffle = Math.floor(Math.random() * maxShuffle) + 1;
      setCurrentSet(set);

      const loadedBins = await loadBins(set);
      const filePath = `/jsOrders/cMST_${taskType}_orders_${set}_1_${shuffle}.json`;
      const res = await fetch(filePath);
      const data: RawTrial[] = await res.json();

      const norm: TrialData[] = data.map((trial, index) => ({
        ...trial,
        image: trial.image.replace(/Set\s*1_rs/i, `Set${set}_rs`).replace(/\s+/g, ''),
        set,
        bin: loadedBins[index]
      }));

      setTrialList(norm);
    }
    catch (e) { console.error('Error loading JS orders: ', e); }
  }, [loadBins]);

  const startExperiment = () => {
    if (!trialList.length || !jsPsychPlugins || !sessionData) return;

    const jsPsych = jsPsychPlugins.initJsPsych({
      display_element: 'jspsych-target',
      on_finish: () => { saveData(jsPsych.data.get().json()); }
    } as Parameters<JsPsychInit>[0]);

    const timeline = [
      {
        type: jsPsychPlugins.preload,
        images: trialList.map((t) => `/img/${encodeURI(t.image)}`),
      },

      ...trialList.map((trial) => ({
        type: jsPsychPlugins.imageButtonResponse,
        stimulus: `/img/${encodeURI(trial.image)}`,
        choices: ['Old', 'Similar', 'New'],
        prompt: `<p>Have you seen this before? Is it Old, Similar, or New?</p>`,
        data: trial,
        on_start: () => {
          const target = document.getElementById('jspsych-target');
          if (target) {
            target.classList.remove('jspsych-book--flip');
            void target.offsetWidth;
            target.classList.add('jspsych-book--flip');
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
        stimulus: `<p>Thank you for completing the task.</p>`,
        choices: ['Finish'],
      },
    ];

    jsPsych.run(timeline);
    setRunning(true);
  };

  const saveData = async (data: string) => {
    const prettified = JSON.stringify(JSON.parse(data), null, 2);
    await fetch('/api/saveData', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: `log_${Date.now()}_Set${currentSet ?? 'NA'}.json`, content: prettified })
    });
  };

  useEffect(() => { if (ready) { loadResources('Flatx2'); } }, [ready, loadResources]);

  return (
    <div className="taskPageContainer">
      {!ready && (
        <SetupComponent
          setSessionData={(session) => setSessionData(session)}
          setReadyToStart={(isReady) => setReady(isReady)}
        />
      )}

      <div id="jspsych-target" className="jspsych-book"></div>

      {ready && !running && (
        <button
          id="continueButton"
          className="taskPageButton"
          onClick={() => loadResources('Flatx2').then(startExperiment)}
        >
          Start Task
        </button>
      )}
    </div>
  );
};

export default TaskPage;
