import Modeler from 'bpmn-js/lib/Modeler';

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import flowableDescriptor from '@jylups/flowable-bpmn-moddle';

import { FlowableBehaviorsModule } from '@jylups/flowable-bpmn-js-behaviors';

import { FlowablePropertiesProviderModule } from '../index.js';

/**
 * Inputs take effect at once in tests instead of after the panel's debounce.
 */
const NoDebounceModule = {
  debounceInput: [ 'value', fn => fn ]
};

let current = null;

/**
 * Creates a modeler with the bpmn.io properties panel, the Flowable
 * provider and the Flowable behaviors, as apps are meant to set it up,
 * imports the XML and returns helpers to drive the panel.
 *
 * @param {string} xml
 */
export async function createModeler(xml) {
  await destroyModeler();

  const container = document.createElement('div');
  container.style.cssText = 'width: 800px; height: 500px;';

  const panel = document.createElement('div');

  document.body.appendChild(container);
  document.body.appendChild(panel);

  const modeler = new Modeler({
    container,
    propertiesPanel: { parent: panel },
    additionalModules: [
      BpmnPropertiesPanelModule,
      BpmnPropertiesProviderModule,
      FlowablePropertiesProviderModule,
      FlowableBehaviorsModule,
      NoDebounceModule
    ],
    moddleExtensions: { flowable: flowableDescriptor }
  });

  await modeler.importXML(xml);

  current = { modeler, container, panel };

  return {
    modeler,
    panel,
    get: name => modeler.get(name),
    element: id => modeler.get('elementRegistry').get(id),
    select: async id => {
      const element = id ? modeler.get('elementRegistry').get(id) : null;

      modeler.get('selection').select(element);

      await tick();

      return element;
    },
    group: id => panel.querySelector(`[data-group-id="group-${ id }"]`),
    entry: id => panel.querySelector(`[data-entry-id="${ id }"]`),
    input: id => panel.querySelector(`[data-entry-id="${ id }"] input, [data-entry-id="${ id }"] textarea, [data-entry-id="${ id }"] select`)
  };
}

export async function destroyModeler() {
  if (!current) {
    return;
  }

  // diagram-js schedules context pad updates in animation frames after a
  // selection; let them run before the canvas is torn down
  current.modeler.get('selection').select(null);
  await nextFrame();
  await nextFrame();

  current.modeler.destroy();
  current.container.remove();
  current.panel.remove();
  current = null;
}

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => resolve()));
}

/**
 * Waits for the panel to render: a macrotask, then an animation frame, since
 * the panel's entries update their local state in effects that run after the
 * next frame.
 */
export function tick() {
  return new Promise(resolve => setTimeout(() => requestAnimationFrame(() => setTimeout(resolve, 0)), 0));
}

/**
 * Changes an input, textarea or select the way a user does and waits for the
 * panel to render again.
 */
export async function changeInput(input, value) {

  // a user focuses the control first, which blurs (and commits) the previous one
  input.focus();

  if (input.type === 'checkbox') {
    if (input.checked !== value) {
      input.click();
    }
  } else {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));

    if (input.tagName === 'SELECT') {
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  await tick();
}

/**
 * Opens a group so its entries are rendered.
 */
export async function openGroup(groupNode) {
  const header = groupNode.querySelector('.bio-properties-panel-group-header');

  if (header && !header.classList.contains('open')) {
    header.click();
    await tick();
  }
}

/**
 * Clicks a list group's add button.
 */
export async function addListItem(groupNode) {
  groupNode.querySelector('.bio-properties-panel-add-entry').click();
  await tick();
}

/**
 * Opens a collapsible list item (or nested list entry item) by its entry id.
 */
export async function openItem(panelNode, id) {
  const item = panelNode.querySelector(`[data-entry-id="${ id }"]`);
  const header = item && item.querySelector('.bio-properties-panel-collapsible-entry-header');

  if (header && !header.classList.contains('open')) {
    header.click();
    await tick();
  }

  return item;
}
