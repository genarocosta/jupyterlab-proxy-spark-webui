import {
  JupyterFrontEnd,
  JupyterFrontEndPlugin
} from '@jupyterlab/application';

import {
  Dialog,
  IFrame,
  MainAreaWidget,
  showDialog
} from '@jupyterlab/apputils';

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
 * Any non-2xx response (including 404) and network errors are treated as
 * unavailable.
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
    const { commands, shell } = app;

    // Keep a reference so we can reactivate an existing tab instead of
    // opening a duplicate.
    let sparkWidget: MainAreaWidget<IFrame> | null = null;

    commands.addCommand(COMMAND_ID, {
      label: 'Open Spark UI',
      execute: async () => {
        const running = await isSparkRunning();

        if (!running) {
          void showDialog({
            title: 'Spark UI',
            body: 'No Spark found (port 4040).',
            buttons: [Dialog.okButton()]
          });
          return;
        }

        // Reactivate the existing tab if still open.
        if (sparkWidget && !sparkWidget.isDisposed) {
          shell.activateById(sparkWidget.id);
          return;
        }

        const base = basePath()!;
        const url = `${base}/proxy/4040/jobs/`;

        const iframe = new IFrame({
          sandbox: [
            'allow-same-origin',
            'allow-scripts',
            'allow-forms',
            'allow-popups'
          ]
        });
        iframe.url = url;
        iframe.title.label = 'Spark UI';

        sparkWidget = new MainAreaWidget({ content: iframe });
        sparkWidget.title.label = 'Spark UI';
        sparkWidget.title.closable = true;

        // Clear the reference when the tab is closed.
        sparkWidget.disposed.connect(() => {
          sparkWidget = null;
        });

        shell.add(sparkWidget, 'main');
        shell.activateById(sparkWidget.id);
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
