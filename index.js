/**
 * Flowable properties provider for bpmn-js-properties-panel.
 *
 * Use it together with the bpmn.io properties panel and the Flowable moddle
 * descriptor (@jylups/flowable-bpmn-moddle):
 *
 *   import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
 *   import { FlowablePropertiesProviderModule } from '@jylups/bpmn-js-properties-panel-flowable';
 *   import flowableDescriptor from '@jylups/flowable-bpmn-moddle';
 *
 *   new Modeler({
 *     additionalModules: [ BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, FlowablePropertiesProviderModule ],
 *     moddleExtensions: { flowable: flowableDescriptor }
 *   });
 */
export { default as FlowablePropertiesProviderModule } from './lib/index.js';

export { default as FlowablePropertiesProvider, GROUPS } from './lib/FlowablePropertiesProvider.js';

export {
  addExtensionElementCommands,
  getExtensionElement,
  getExtensionElementsList,
  removeExtensionElementsCommands,
  setExtensionElementBody
} from './lib/util/ExtensionElementsUtil.js';
