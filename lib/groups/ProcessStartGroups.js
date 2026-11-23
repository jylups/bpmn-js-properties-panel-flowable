import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  Group,
  SelectEntry,
  TextFieldEntry,
  isCheckboxEntryEdited,
  isSelectEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is } from 'bpmn-js/lib/util/ModelUtil';

import { checkboxEntry, textEntry } from '../entries/AttributeEntries.js';

import {
  addExtensionElementCommands,
  getExtensionElement,
  removeExtensionElementsCommands,
  setExtensionElementBody
} from '../util/ExtensionElementsUtil.js';

import {
  createResourceAssignment,
  getFormalExpression,
  setFormalExpressionCommand
} from '../util/ResourceAssignmentUtil.js';


const HISTORY_LEVELS = [
  { value: '', label: 'Engine default' },
  { value: 'none', label: 'None' },
  { value: 'activity', label: 'Activity' },
  { value: 'audit', label: 'Audit' },
  { value: 'full', label: 'Full' },
  { value: 'instance', label: 'Instance' },
  { value: 'task', label: 'Task' }
];


/**
 * The process: who may start it, history level and eager execution fetching
 * (inventory section 2). Shown for the process, or for the process of a
 * participant.
 */
export function ProcessGroup(element, injector) {
  const process = getProcess(element);

  if (!process) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-process',
    label: translate('Process'),
    component: Group,
    entries: [
      { id: 'flowable-candidateStarterUsers', component: CandidateStarterUsers, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-candidateStarterGroups', component: CandidateStarterGroups, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-potentialStarter', component: PotentialStarterEntry, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-historyLevel', component: HistoryLevelEntry, isEdited: isSelectEntryEdited },
      { id: 'flowable-isEagerExecutionFetching', component: EagerExecutionFetching, isEdited: isCheckboxEntryEdited }
    ]
  };
}

/**
 * The start event: initiator and start form (inventory section 3).
 */
export function StartEventGroup(element, injector) {
  if (!is(element, 'bpmn:StartEvent')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-start',
    label: translate('Start'),
    component: Group,
    entries: [
      { id: 'flowable-initiator', component: Initiator, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-formKey', component: FormKey, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-formFieldValidation', component: FormFieldValidation, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-sameDeployment', component: SameDeployment, isEdited: isCheckboxEntryEdited }
    ]
  };
}


// process //////////

const processTarget = element => getProcess(element);

const CandidateStarterUsers = textEntry('flowable:candidateStarterUsers', 'Candidate starter users', {
  getTarget: processTarget,
  description: 'Comma-separated user IDs'
});

const CandidateStarterGroups = textEntry('flowable:candidateStarterGroups', 'Candidate starter groups', {
  getTarget: processTarget,
  description: 'Comma-separated group IDs'
});

const EagerExecutionFetching = checkboxEntry('flowable:isEagerExecutionFetching', 'Eager execution fetching', {
  getTarget: processTarget,
  tooltip: 'Fetch all executions of an instance at once, which helps processes with many parallel paths.'
});

function HistoryLevelEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const process = getProcess(element);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('History level'),
    tooltip: translate('Overrides the history level of the engine for this process.'),
    getOptions: () => HISTORY_LEVELS.map(level => ({ value: level.value, label: translate(level.label) })),
    getValue: () => getExtensionElement(process, 'flowable:HistoryLevel')?.get('body') || '',
    setValue: value => setExtensionElementBody({
      element,
      businessObject: process,
      type: 'flowable:HistoryLevel',
      value,
      bpmnFactory,
      commandStack
    })
  });
}

/**
 * The potential starters as the text of their formal expression, for example
 * "user(kermit), group(management)".
 */
function PotentialStarterEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const process = getProcess(element);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Potential starters'),
    description: translate('For example user(kermit), group(management)'),
    debounce,
    getValue: () => getFormalExpression(getExtensionElement(process, 'flowable:PotentialStarter'))?.get('body') || '',
    setValue: value => {
      const existing = getExtensionElement(process, 'flowable:PotentialStarter');
      let commands;

      if (!value) {
        commands = existing ? removeExtensionElementsCommands(element, process, [ existing ]) : [];
      } else if (existing) {
        commands = [ setFormalExpressionCommand(element, existing, value, bpmnFactory) ];
      } else {
        const starter = bpmnFactory.create('flowable:PotentialStarter', {
          resourceAssignmentExpression: createResourceAssignment(bpmnFactory, value)
        });

        starter.get('resourceAssignmentExpression').$parent = starter;

        commands = addExtensionElementCommands(element, process, starter, bpmnFactory);
      }

      if (commands.length) {
        commandStack.execute('properties-panel.multi-command-executor', commands);
      }
    }
  });
}


// start event //////////

const Initiator = textEntry('flowable:initiator', 'Initiator', {
  description: 'Variable that receives the ID of the user who starts the process'
});

export const FormKey = textEntry('flowable:formKey', 'Form key');

export const FormFieldValidation = textEntry('flowable:formFieldValidation', 'Form field validation', {
  description: 'true, false or an expression'
});

export const SameDeployment = checkboxEntry('flowable:sameDeployment', 'Form from the same deployment', {
  defaultValue: true,
  tooltip: 'Look the form up in the deployment of this process first (Flowable default).'
});


// helpers //////////

/**
 * The process of the element: the process itself, or the process of a
 * participant.
 */
export function getProcess(element) {
  if (is(element, 'bpmn:Process')) {
    return element.businessObject;
  }

  if (is(element, 'bpmn:Participant')) {
    return element.businessObject.get('processRef') || null;
  }

  return null;
}
