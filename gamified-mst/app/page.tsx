'use client';

import { useCallback, useEffect, useState } from "react";
import SetupComponent, { Session } from "./setup";
import {
  TaskType,
  JsPsychBundle,
  JsPsychInit,
  RawTrial,
  TrialData,
} from "./types/mst";
// import Instructions from "./Instructions";

import 'jspsych/css/jspsych.css';

const TaskPage = () => {
  const [trialList, setTrialList] = useState<TrialData[]>([]);
  const [jsPsychPlugins, setJsPsychPlugins] = useState<JsPsychBundle | null>(null);
  const [sessionData, setSessionData] = useState<Session | null>(null);
  const [ready, setReady] = useState<boolean>(false);
  // const [showInstructions, setShowInstructions] = useState<any>(false);
  const [currentSet, setCurrentSet] = useState<number | null>(null);

  // Load JSPsych plugins - no clue how this works but it does :)
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

  // Load the json res for the specific trial
  const loadResources = useCallback(async (taskType: TaskType) => {
    try {
      // Currently randomizing the sets: will also work for different jsOrders TaskTypes in the future
      const maxSet = 6;
      const maxShuffle = 2;

      const set = Math.floor(Math.random() * maxSet) + 1;
      const shuffle = Math.floor(Math.random() * maxShuffle) + 1;
      setCurrentSet(set);

      const loadedBins = await loadBins(set);
      const filePath = `/jsOrders/cMST_${taskType}_orders_${set}_1_${shuffle}.json`; // Current filepath naming scheme
      const res = await fetch(filePath);
      const data: RawTrial[] = await res.json();

      // Normalize the file name
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

  // Start experiment
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
        prompt: `<p>Did you see this before? Is it Old, Similar, or New?</p>`,
        data: trial,
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
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      {!ready && (
        <SetupComponent
          setSessionData={(session) => setSessionData(session)}
          setReadyToStart={(isReady) => setReady(isReady)}
        />
      )}

      <div id="jspsych-target"></div>

      {ready && (
        <button
          id="continueButton"
          onClick={() => loadResources('Flatx2').then(startExperiment)}
          style={{ fontSize: "1.25rem", marginTop: "1rem" }}
        >
          Start Task
        </button>
      )}
    </div>
  );
};

export default TaskPage;