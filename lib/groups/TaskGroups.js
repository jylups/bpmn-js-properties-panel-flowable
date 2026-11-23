import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  Group,
  TextFieldEntry,
  isCheckboxEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { checkboxEntry, textEntry } from '../entries/AttributeEntries.js';

import { extensionBodyEntry } from '../entries/ExtensionBodyEntry.js';


/**
 * Script task options (inventory section 6). The script itself and its format
 * are standard BPMN, edited in the bpmn.io groups.
 */
export function ScriptTaskGroup(element, injector) {
  if (!is(element, 'bpmn:ScriptTask')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-scriptTask',
    label: translate('Script options'),
    component: Group,
    entries: [
      { id: 'flowable-scriptResultVariable', component: ScriptResultVariable, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-autoStoreVariables', component: AutoStoreVariables, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-doNotIncludeVariables', component: DoNotIncludeVariables, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-skipExpression', component: SkipExpression, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * Business rule task settings (inventory section 6).
 */
export function BusinessRuleTaskGroup(element, injector) {
  if (!is(element, 'bpmn:BusinessRuleTask')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-businessRule',
    label: translate('Business rule'),
    component: Group,
    entries: [
      { id: 'flowable-ruleVariablesInput', component: RuleVariablesInput, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-rules', component: Rules, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-exclude', component: Exclude, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-ruleResultVariable', component: RuleResultVariable, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-ruleClass', component: RuleClass, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * Receive task: skip expression and the event registry event it waits for.
 */
export function ReceiveTaskGroup(element, injector) {
  if (!is(element, 'bpmn:ReceiveTask')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-receiveTask',
    label: translate('Receive'),
    component: Group,
    entries: [
      { id: 'flowable-eventType', component: EventTypeEntry, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-eventName', component: EventNameEntry, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-skipExpression', component: SkipExpression, isEdited: isTextFieldEntryEdited }
    ]
  };
}

// script task //////////

/**
 * The result variable of a script task. Flowable also reads the
 * resultVariableName alias; editing writes resultVariable and drops the alias.
 */
function ScriptResultVariable({ element, id }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const businessObject = element.businessObject;

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Result variable'),
    debounce,
    getValue: () => businessObject.get('flowable:resultVariable') ?? businessObject.get('flowable:resultVariableName') ?? '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: businessObject,
      properties: { 'flowable:resultVariable': value || undefined, 'flowable:resultVariableName': undefined }
    })
  });
}

const AutoStoreVariables = checkboxEntry('flowable:autoStoreVariables', 'Store script variables', {
  tooltip: 'Store variables defined in the script as process variables (older engines).'
});

const DoNotIncludeVariables = checkboxEntry('flowable:doNotIncludeVariables', 'Do not include variables', {
  tooltip: 'Do not expose all process variables to the script.'
});

const SkipExpression = textEntry('flowable:skipExpression', 'Skip expression', {
  description: 'Skips the task when true; needs the _FLOWABLE_SKIP_EXPRESSION_ENABLED variable'
});


// business rule task //////////

const RuleVariablesInput = textEntry('flowable:ruleVariablesInput', 'Input variables', {
  description: 'Comma-separated variable names'
});

const Rules = textEntry('flowable:rules', 'Rules', {
  description: 'Comma-separated rule names; empty runs all rules'
});

const Exclude = checkboxEntry('flowable:exclude', 'Exclude the listed rules');

const RuleResultVariable = textEntry('flowable:resultVariable', 'Result variable');

const RuleClass = textEntry('flowable:class', 'Java class', {
  description: 'Custom implementation instead of the rules engine'
});


// receive task //////////

const EventTypeEntry = extensionBodyEntry('flowable:EventType', 'Event key', 'Event registry event that completes the task');

const EventNameEntry = extensionBodyEntry('flowable:EventName', 'Event name');
