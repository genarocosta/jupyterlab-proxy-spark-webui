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
 *
 * Security notes:
 *   - base is passed in (resolved once by the caller) to avoid a TOCTOU
 *     race between the probe and the iframe URL construction.
 *   - Redirects are followed but the final URL is verified to remain on
 *     the same origin, preventing a misconfigured proxy from silently
 *     redirecting the probe to an external host.
 */
async function isSparkRunning(base: string): Promise<boolean> {
  try {
    const response = await fetch(`${base}/proxy/4040/jobs/`, {
      method: 'HEAD',
      redirect: 'follow'
    });
    // Reject responses that were redirected off-origin.
    if (!response.url.startsWith(window.location.origin)) {
      return false;
    }
    return response.ok; // 200–299 only
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

    let sparkWidget: MainAreaWidget<IFrame> | null = null;

    commands.addCommand(COMMAND_ID, {
      label: 'Open Spark UI',
      execute: async () => {
        // Resolve base path once and pass it into the probe — both the check
        // and the iframe URL use the same value, eliminating the TOCTOU race.
        const base = basePath();
        if (base === null) {
          void showDialog({
            title: 'Spark UI',
            body: 'No Spark found (port 4040).',
            buttons: [Dialog.okButton()]
          });
          return;
        }

        const running = await isSparkRunning(base);
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

        const iframe = new IFrame({
          sandbox: [
            // 'allow-same-origin' is intentionally omitted.
            // Combining allow-same-origin with allow-scripts lets the iframe
            // remove its own sandbox attribute and gain full access to the
            // parent JupyterLab context (cookies, tokens, kernels).
            'allow-scripts',
            'allow-forms'
            // 'allow-popups' is omitted: Spark UI does not need to open
            // new windows, and allowing it enables tab-napping attacks.
          ]
        });
        iframe.url = `${base}/proxy/4040/jobs/`;
        iframe.title.label = 'Spark UI';

        sparkWidget = new MainAreaWidget({ content: iframe });
        sparkWidget.title.label = 'Spark UI';
        sparkWidget.title.closable = true;

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
