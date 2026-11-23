import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import { TextFieldEntry } from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { getExtensionElement, setExtensionElementBody } from '../util/ExtensionElementsUtil.js';

import { expressions } from '../util/Validation.js';


/**
 * A text entry for the body of a single extension element of the selected
 * element, such as <flowable:eventType>. Setting a value creates the element,
 * clearing it removes the element.
 *
 * @param {string} type - e.g. 'flowable:EventType'
 * @param {string} label
 * @param {string} [description]
 */
export function extensionBodyEntry(type, label, description) {
  return function ExtensionBodyEntry({ element, id }) {
    const bpmnFactory = useService('bpmnFactory');
    const commandStack = useService('commandStack');
    const debounce = useService('debounceInput');
    const translate = useService('translate');

    return jsx(TextFieldEntry, {
      element,
      id,
      label: translate(label),
      description: description && translate(description),
      debounce,
      validate: value => expressions(value, translate),
      getValue: () => getExtensionElement(element.businessObject, type)?.get('body') || '',
      setValue: value => setExtensionElementBody({ element, type, value, bpmnFactory, commandStack })
    });
  };
}
