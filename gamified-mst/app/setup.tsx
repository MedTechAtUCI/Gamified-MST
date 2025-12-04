'use client';

import { useEffect } from 'react';

// Prev attributes -> modify if not necessary later
export interface Session {
  sid: string;
  cond: number;
  order: number[];
  set_omst: number;
  taskindex: number;
  selfpaced: boolean;
  resp_mode: 'button';
}

interface SetupProps {
  setSessionData: (session: Session) => void;
  setReadyToStart: (ready: boolean) => void;
}

const SetupComponent = ({ setSessionData, setReadyToStart }: SetupProps) => {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // Default SID for JATOS
    const sid = params.get('sid') ?? '0';
    const nruns = Number(localStorage.getItem('nruns') ?? 0);
    const cond = nruns % 2;

    const session: Session = {
      sid,
      cond,
      order: [5, 6], // Default orders for testing, modify here
      set_omst: cond === 0 ? 1 : 2,
      taskindex: 0,
      selfpaced: true,
      resp_mode: 'button',
    };

    setSessionData(session);
    localStorage.setItem('nruns', String(nruns + 1));

    setReadyToStart(true);
  }, [setSessionData, setReadyToStart]);
  return null;
};

export default SetupComponent;