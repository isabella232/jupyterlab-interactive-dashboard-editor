import { NotebookPanel, NotebookActions, INotebookTracker} from '@jupyterlab/notebook';

import { Widget } from '@lumino/widgets';

import { ToolbarButton, WidgetTracker, sessionContextDialogs, InputDialog} from '@jupyterlab/apputils';

import { CodeCell } from '@jupyterlab/cells';

import { saveIcon, refreshIcon, undoIcon, cutIcon, copyIcon, pasteIcon, runIcon, stopIcon, fastForwardIcon} from '@jupyterlab/ui-components';

import { Dashboard } from './dashboard';

import { DashboardWidget } from './widget';

import { saveDialog } from './dialog';

import { Icons} from './icons';

import { Widgetstore } from './widgetstore';

import { addCellId, addNotebookId } from './utils';

import {openfullscreen} from './fullscreen';
import { DBUtils } from './dbUtils';

export function buildToolbar(notebookTrakcer: INotebookTracker,
  dashboard: Dashboard, tracker: WidgetTracker<DashboardWidget>, utils: DBUtils){
  dashboard.toolbar.addItem('save', createSaveButton(dashboard, notebookTrakcer));
  dashboard.toolbar.addItem('undo', createUndoButton(dashboard));
  dashboard.toolbar.addItem('redo', createRedoButton(dashboard));
  dashboard.toolbar.addItem('cut', createCutButton(dashboard, tracker, utils));
  dashboard.toolbar.addItem('copy', createCopyButton(dashboard, tracker, utils));
  dashboard.toolbar.addItem('paste', createPasteButton(dashboard, utils));
  dashboard.toolbar.addItem('run', createRunButton(dashboard, tracker));
  dashboard.toolbar.addItem('stop', createStopButton(dashboard, tracker));
  dashboard.toolbar.addItem('full screen', createFullScreenButton(dashboard));
}

/**
 * Create full screen toolbar item.
 */

export function createFullScreenButton(
  dashboard: Dashboard,
): Widget {
  const button = new ToolbarButton({
    icon: Icons.fullscreenToolbarIcon,
    onClick: (): void => {
      // console.log("clicked to view");

      openfullscreen(dashboard.area.node);
      // console.log("getting corner node?");
    },
    tooltip: 'View in full screen',
  });
  return button;
}

/**
 * Create save button toolbar item.
 */

export function createSaveButton(
  dashboard: Dashboard,
  notebookTracker: INotebookTracker
): Widget {
  const button = new ToolbarButton({
    icon: saveIcon,
    onClick: (): void => {
      const filename = `${dashboard.getName()}.dashboard`;
      InputDialog.getText({ title: 'Save as', text: filename }).then(
        (value) => {
          dashboard.save(notebookTracker, value.value);
        }
      );
      dashboard.dirty = false;
      const dialog = saveDialog(dashboard);
      dialog.launch().then((result) => {
        dialog.dispose();
      });
    },
    tooltip: 'Save Dashboard',
  });
  return button;
}

/**
 * Create undo button toolbar item.
 */

export function createUndoButton(
  dashboard: Dashboard
): Widget {
  const button = new ToolbarButton({
    icon: undoIcon,
    onClick: (): void => {
      dashboard.undo();
    },
    tooltip: 'Undo',
  });
  return button;
}

/**
 * Create redo button toolbar item.
 */

export function createRedoButton(
  dashboard: Dashboard
): Widget {
  const button = new ToolbarButton({
    icon: Icons.redoToolbarIcon,
    onClick: (): void => {
      dashboard.redo();
    },
    tooltip: 'Redo',
  });
  return button;
}

/**
 * Create cut button toolbar item.
 */

export function createCutButton(
  dashboard: Dashboard,
  outputTracker: WidgetTracker<DashboardWidget>,
  utils: DBUtils
): Widget {
  const button = new ToolbarButton({
    icon: cutIcon,
    onClick: (): void => {
      utils.clipboard.clear();
      const widget = outputTracker.currentWidget;
      utils.clipboard.add(widget);
      dashboard.deleteWidget(widget);
    },
    tooltip: 'Cut the selected outputs',
  });
  return button;
}

/**
 * Create copy button toolbar item.
 */

export function createCopyButton(
  dashboard: Dashboard,
  outputTracker: WidgetTracker<DashboardWidget>,
  untils: DBUtils
): Widget {
  const button = new ToolbarButton({
    icon: copyIcon,
    onClick: (): void => {
      untils.clipboard.clear();
      const widget = outputTracker.currentWidget;
      untils.clipboard.add(widget);
    },
    tooltip: 'Copy the selected outputs',
  });
  return button;
}

function pasteWidget(dashboard:Dashboard, widget: DashboardWidget){
  const notebookId = addNotebookId(widget.notebook);
  const cellId = addCellId(widget.cell);
  const notebook = widget.notebook;
  const cell = widget.cell;
  const newWidget = new DashboardWidget({ notebook, cell, notebookId, cellId });

  const info: Widgetstore.WidgetInfo = {
    widgetId: DashboardWidget.createDashboardWidgetId(),
    notebookId: newWidget.notebookId,
    cellId: newWidget.cellId,
    left: 0,
    top: 0,
    width: Number(widget.node.style.width.split("p")[0]),
    height: Number(widget.node.style.height.split("p")[0]),
    removed: false,
  };
  // console.log(cell, notebook.sessionContext?.kernelDisplayStatus);
  dashboard.area.addWidget(newWidget, info);
  dashboard.area.updateWidgetInfo(info); 
}

/**
 * Create paste button toolbar item.
 */

export function createPasteButton(
  dashboard: Dashboard,
  untils: DBUtils
): Widget {
  const button = new ToolbarButton({
    icon: pasteIcon,
    onClick: (): void => {
      untils.clipboard.forEach(widget => pasteWidget(dashboard, widget));
    },
    tooltip: 'Paste outputs from the clipboard',
  });
  return button;
}

/**
 * Create run button toolbar item.
 */

export function createRunButton(
  dashboard: Dashboard,
  tracker: WidgetTracker<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: runIcon,
    onClick: (): void => {
      const cell = (tracker.currentWidget.cell as CodeCell);
      const sessionContext = tracker.currentWidget.notebook.sessionContext;
      CodeCell.execute(cell, sessionContext);
    },
    tooltip: 'Run the selected outputs',
  });
  return button;
}

/**
 * Create stop button toolbar item.
 */

export function createStopButton(
  dashboard: Dashboard,
  tracker: WidgetTracker<DashboardWidget>
): Widget {
  const button = new ToolbarButton({
    icon: stopIcon,
    onClick: (): void => {
      const sessionContext = tracker.currentWidget.notebook.sessionContext;
      void sessionContext.session?.kernel?.interrupt();
    },
    tooltip: 'Interrupt all kernels',
  });
  return button;
}

/**
 * Create restart button toolbar item.
 */

export function createRestartButton(
  dashboard: Dashboard
): Widget {
  const button = new ToolbarButton({
    icon: refreshIcon,
    onClick: (): void => {
      const notebooks = new Set<NotebookPanel>();
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      while (widget) {
        notebooks.add(widget.notebook);
        console.log("notebook here one", widget.notebook);
        widget = widgets.next() as DashboardWidget;
      }
      notebooks.forEach(nb => void sessionContextDialogs.restart(nb.sessionContext));      
    },
    tooltip: 'Restart all kernels',
  });
  return button;
}

/**
 * Create run all button toolbar item.
 */

export function createRunAllButton(
  dashboard: Dashboard
): Widget {
  const button = new ToolbarButton({
    icon: fastForwardIcon,
    onClick: (): void => {
      const notebooks = new Set<NotebookPanel>();
      const widgets = dashboard.content.children().iter();
      let widget = widgets.next() as DashboardWidget;
      while (widget) {
        notebooks.add(widget.notebook);
        console.log(widget);
        widget = widgets.next() as DashboardWidget;
      }

      console.log("notebooks", notebooks);
      notebooks.forEach(nb => void sessionContextDialogs.restart(nb.sessionContext)
      .then(restarted => {
        if (restarted) {
          void NotebookActions.runAll(nb.content, nb.sessionContext);
        }
      }));
    },
    tooltip: 'Restart all kernels, then re-run all notebooks',
  });
  return button;
}