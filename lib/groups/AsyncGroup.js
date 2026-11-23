import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CheckboxEntry,
  Group,
  TextFieldEntry,
  isCheckboxEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { getExtensionElement, setExtensionElementBody } from '../util/ExtensionElementsUtil.js';

import { all, expressions, isExpression } from '../util/Validation.js';

const ISO_8601_REPEAT = /^R(\d+)?\/(.+)$/;


/**
 * Asynchronous execution of flow nodes (inventory section 1): async,
 * exclusive, asyncLeave, asyncLeaveExclusive, the failed job retry cycle and
 * the job category.
 */
export function AsyncGroup(element, injector) {
  if (!is(element, 'bpmn:FlowNode')) {
    return null;
  }

  const translate = injector.get('translate');
  const businessObject = element.businessObject;

  const entries = [
    { id: 'flowable-async', component: AsyncEntry, isEdited: isCheckboxEntryEdited }
  ];

  if (businessObject.get('flowable:async')) {
    entries.push({ id: 'flowable-exclusive', component: ExclusiveEntry, isEdited: isCheckboxEntryEdited });
  }

  entries.push({ id: 'flowable-asyncLeave', component: AsyncLeaveEntry, isEdited: isCheckboxEntryEdited });

  if (businessObject.get('flowable:asyncLeave')) {
    entries.push({ id: 'flowable-asyncLeaveExclusive', component: AsyncLeaveExclusiveEntry, isEdited: isCheckboxEntryEdited });
  }

  if (is(element, 'bpmn:Activity')) {
    entries.push({ id: 'flowable-failedJobRetryTimeCycle', component: FailedJobRetryTimeCycleEntry, isEdited: isTextFieldEntryEdited });
  }

  entries.push({ id: 'flowable-jobCategory', component: JobCategoryEntry, isEdited: isTextFieldEntryEdited });

  return {
    id: 'flowable-async',
    label: translate('Asynchronous execution'),
    component: Group,
    entries
  };
}


// boolean attributes //////////

function booleanAttributeEntry(property, label, tooltip) {
  return function BooleanAttributeEntry({ element, id }) {
    const modeling = useService('modeling');
    const translate = useService('translate');

    return jsx(CheckboxEntry, {
      element,
      id,
      label: translate(label),
      tooltip: tooltip && translate(tooltip),
      getValue: () => !!element.businessObject.get(property),
      setValue: value => modeling.updateProperties(element, { [property]: value || undefined })
    });
  };
}

const AsyncEntry = booleanAttributeEntry('flowable:async', 'Asynchronous',
  'Continue in a job before this element is executed.');

const ExclusiveEntry = booleanAttributeEntry('flowable:exclusive', 'Exclusive',
  'Run the job exclusively: jobs of the same process instance do not run at the same time.');

const AsyncLeaveEntry = booleanAttributeEntry('flowable:asyncLeave', 'Asynchronous leave',
  'Continue in a job after this element is executed.');

const AsyncLeaveExclusiveEntry = booleanAttributeEntry('flowable:asyncLeaveExclusive', 'Exclusive leave',
  'Run the leave job exclusively.');


// extension element bodies //////////

function bodyEntry(type, label, options = {}) {
  return function BodyEntry({ element, id }) {
    const bpmnFactory = useService('bpmnFactory');
    const commandStack = useService('commandStack');
    const debounce = useService('debounceInput');
    const translate = useService('translate');

    return jsx(TextFieldEntry, {
      element,
      id,
      label: translate(label),
      description: options.description && translate(options.description),
      debounce,
      validate: value => all(expressions, options.validate)(value, translate),
      getValue: () => {
        const extension = getExtensionElement(element.businessObject, type);

        return extension ? extension.get('body') : '';
      },
      setValue: value => setExtensionElementBody({ element, type, value, bpmnFactory, commandStack })
    });
  };
}

const FailedJobRetryTimeCycleEntry = bodyEntry('flowable:FailedJobRetryTimeCycle', 'Retry time cycle', {
  description: 'ISO 8601 repeat, for example R5/PT7M',
  validate: (value, translate) => {
    if (value && !isExpression(value) && !ISO_8601_REPEAT.test(value.trim())) {
      return translate('Must be an ISO 8601 repeating interval, for example R5/PT7M, or an expression.');
    }
  }
});

const JobCategoryEntry = bodyEntry('flowable:JobCategory', 'Job category', {
  description: 'Text or expression; jobs can be executed per category'
});
