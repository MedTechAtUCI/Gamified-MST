export type TaskType = 'Imbal2x3'; // Only Imbal2x3 is currently used (sets 1-5, _1_1 variant only)

export type JsPsychInit = typeof import('jspsych')['initJsPsych'];
export type PreloadPlugin = typeof import('@jspsych/plugin-preload')['default'];
export type HtmlButtonResponsePlugin = typeof import('@jspsych/plugin-html-button-response')['default'];
export type ImageButtonResponsePlugin = typeof import('@jspsych/plugin-image-button-response')['default'];

export interface JsPsychBundle {
  initJsPsych: JsPsychInit;
  preload: PreloadPlugin;
  htmlButtonResponse: HtmlButtonResponsePlugin;
  imageButtonResponse: ImageButtonResponsePlugin;
}

export interface RawTrial {
  trial: number;
  image: string;
  correct_resp: number;
  [key: string]: unknown;
}

export interface TrialData extends RawTrial {
  set: number;
  bin: number;
}
