import Modeler from 'bpmn-js/lib/Modeler';

import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule
} from 'bpmn-js-properties-panel';

import flowableDescriptor from '@jylups/flowable-bpmn-moddle';

import { FlowablePropertiesProviderModule } from '../index.js';

/**
 * Inputs take effect at once in tests instead of after the panel's debounce.
 */
const NoDebounceModule = {
  debounceInput: [ 'value', fn => fn ]
};

let current = null;

/**
 * Creates a modeler with the bpmn.io properties panel and the Flowable
 * provider, imports the XML and returns helpers to drive the panel.
 *
 * @param {string} xml
 */
export async function createModeler(xml) {
  destroyModeler();

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

export function destroyModeler() {
  if (!current) {
    return;
  }

  current.modeler.destroy();
  current.container.remove();
  current.panel.remove();
  current = null;
}

export function tick() {
  return new Promise(resolve => setTimeout(resolve, 0));
}

/**
 * Changes an input, textarea or select the way a user does and waits for the
 * panel to render again.
 */
export async function changeInput(input, value) {
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
