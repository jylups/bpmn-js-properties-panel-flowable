import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  Group,
  SelectEntry,
  TextAreaEntry,
  isSelectEntryEdited,
  isTextAreaEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { getExtensionElement, setExtensionElementBody } from '../util/ExtensionElementsUtil.js';


/**
 * Flowable settings shared by flow elements (inventory section 1): the
 * multi-line element name and whether the element is kept in history.
 */
export function GeneralGroup(element, injector) {
  if (!is(element, 'bpmn:FlowElement')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-general',
    label: translate('Flowable'),
    component: Group,
    entries: [
      { id: 'flowable-elementName', component: ElementNameEntry, isEdited: isTextAreaEntryEdited },
      { id: 'flowable-includeInHistory', component: IncludeInHistoryEntry, isEdited: isSelectEntryEdited }
    ]
  };
}


function ElementNameEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextAreaEntry, {
    element,
    id,
    label: translate('Multi-line name'),
    description: translate('Name with line breaks, shown by Flowable instead of the name'),
    debounce,
    rows: 2,
    getValue: () => {
      const extension = getExtensionElement(element.businessObject, 'flowable:Element-name');

      return extension ? extension.get('body') : '';
    },
    setValue: value => setExtensionElementBody({
      element,
      type: 'flowable:Element-name',
      value,
      bpmnFactory,
      commandStack
    })
  });
}

function IncludeInHistoryEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('History'),
    tooltip: translate('Overrides the process history level for this element (<flowable:includeInHistory>).'),
    getOptions: () => [
      { value: '', label: translate('Default') },
      { value: 'true', label: translate('Include') },
      { value: 'false', label: translate('Exclude') }
    ],
    getValue: () => {
      const extension = getExtensionElement(element.businessObject, 'flowable:IncludeInHistory');

      return extension ? extension.get('body') : '';
    },
    setValue: value => setExtensionElementBody({
      element,
      type: 'flowable:IncludeInHistory',
      value,
      bpmnFactory,
      commandStack
    })
  });
}
