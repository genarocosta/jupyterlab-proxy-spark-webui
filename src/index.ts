import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import { showDialog, Dialog } from '@jupyterlab/apputils';

import { IMainMenu } from '@jupyterlab/mainmenu';

import { Menu } from '@lumino/widgets';

const PLUGIN_ID = 'jupyterlab-spark-webui:plugin';
const COMMAND_ID = 'spark-webui:open';

/**
 * Return the base path before the JupyterLab mount point (/lab).
 * The lookahead (?=\/|$|\?) prevents matching /laboratory, /label, etc.
 *
 *   /notebook/ns/nb/lab/tree  →  /notebook/ns/nb
 *   /jupyter/lab              →  /jupyter
 *   /lab                      →  (empty string)
 */
function basePath(): string | null {
  const match = window.location.pathname.match(/^(.*)\/lab(?=\/|$|\?)/);
  return match ? match[1] : null;
}

/**
 * Probe port 4040 through the notebook proxy.
 * jupyter-server-proxy returns 502/503 when the target is unreachable,
 * so any status < 500 means Spark is up.
 */
async function isSparkRunning(): Promise<boolean> {
  const base = basePath();
  if (base === null) {
    return false;
  }
  try {
    const response = await fetch(`${base}/proxy/4040/jobs/`, {
      method: 'HEAD',
      redirect: 'follow'
    });
    return response.ok; // 200–299 only; 4xx and 5xx are treated as unavailable
  } catch {
    return false;
  }
}

const plugin: JupyterFrontEndPlugin<void> = {
  id: PLUGIN_ID,
  autoStart: true,
  optional: [IMainMenu],
  activate: (app: JupyterFrontEnd, mainMenu: IMainMenu | null) => {
    const { commands } = app;

    commands.addCommand(COMMAND_ID, {
      label: 'Open Spark UI',
      execute: async () => {
        const running = await isSparkRunning();
        if (running) {
          const base = basePath();
          window.open(`${base}/proxy/4040/jobs/`, '_blank');
        } else {
          void showDialog({
            title: 'Spark UI',
            body: 'No Spark found (port 4040).',
            buttons: [Dialog.okButton()]
          });
        }
      }
    });

    if (!mainMenu) {
      return;
    }

    const menu = new Menu({ commands });
    menu.title.label = 'Spark UI';
    menu.addItem({ command: COMMAND_ID });
    mainMenu.addMenu(menu, false, { rank: 998 });
  }
};

export default plugin;
