import { AsyncGroup } from './groups/AsyncGroup.js';
import { GeneralGroup } from './groups/GeneralGroup.js';

/**
 * Lower than the default (1000) of the bpmn.io provider, so the Flowable groups
 * are added after the BPMN ones.
 */
const LOW_PRIORITY = 500;

/**
 * Group factories in display order. Each takes (element, injector) and returns
 * a group, or null when it does not apply to the element.
 */
export const GROUPS = [
  GeneralGroup,
  AsyncGroup
];


/**
 * Adds the Flowable groups to the bpmn.io properties panel.
 *
 * Needs the Flowable moddle descriptor (@jylups/flowable-bpmn-moddle)
 * registered as moddle extension `flowable`.
 */
export default class FlowablePropertiesProvider {

  constructor(propertiesPanel, injector) {
    this._injector = injector;

    propertiesPanel.registerProvider(LOW_PRIORITY, this);
  }

  getGroups(element) {
    return groups => {
      const flowableGroups = GROUPS
        .map(createGroup => createGroup(element, this._injector))
        .filter(group => group && group.entries.length);

      return [ ...groups, ...flowableGroups ];
    };
  }
}

FlowablePropertiesProvider.$inject = [ 'propertiesPanel', 'injector' ];
