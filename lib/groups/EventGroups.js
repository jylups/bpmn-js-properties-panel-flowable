import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CheckboxEntry,
  Group,
  SelectEntry,
  isCheckboxEntryEdited,
  isSelectEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { checkboxEntry, textEntry } from '../entries/AttributeEntries.js';

import { extensionBodyEntry } from '../entries/ExtensionBodyEntry.js';

import { parameterGroup } from './IOParameterGroups.js';

import {
  addExtensionElementCommands,
  getExtensionElement,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';


const CATCH_EVENTS = [ 'bpmn:StartEvent', 'bpmn:BoundaryEvent', 'bpmn:IntermediateCatchEvent' ];

const THROW_EVENTS = [ 'bpmn:IntermediateThrowEvent', 'bpmn:EndEvent' ];

const CHANGE_TYPES = [
  { value: 'all', label: 'All changes' },
  { value: 'create', label: 'Create' },
  { value: 'update', label: 'Update' },
  { value: 'update-create', label: 'Create or update' },
  { value: 'delete', label: 'Delete' }
];


/**
 * The first BPMN event definition of an event, if any.
 */
export function getEventDefinition(element) {
  const definitions = element.businessObject.get('eventDefinitions');

  return (definitions && definitions[0]) || null;
}

/**
 * Flowable options of a timer, signal, message, error or terminate event
 * definition (inventory section 11).
 */
export function EventDefinitionGroup(element, injector) {
  if (!is(element, 'bpmn:Event')) {
    return null;
  }

  const definition = getEventDefinition(element);

  if (!definition) {
    return null;
  }

  const translate = injector.get('translate');

  let label;
  let entries;

  if (is(definition, 'bpmn:TimerEventDefinition')) {
    label = 'Timer options';
    entries = [
      { id: 'flowable-businessCalendarName', component: BusinessCalendarName, isEdited: isTextFieldEntryEdited }
    ];

    if (definition.get('timeCycle')) {
      entries.push({ id: 'flowable-timeCycleEndDate', component: TimeCycleEndDate, isEdited: isTextFieldEntryEdited });
    }
  } else if (is(definition, 'bpmn:SignalEventDefinition')) {
    label = 'Signal options';
    entries = [
      { id: 'flowable-signalExpression', component: SignalExpression, isEdited: isTextFieldEntryEdited }
    ];

    if (isAny(element, THROW_EVENTS)) {
      entries.push({ id: 'flowable-signalAsync', component: SignalAsync, isEdited: isCheckboxEntryEdited });
    }
  } else if (is(definition, 'bpmn:MessageEventDefinition')) {
    label = 'Message options';
    entries = [
      { id: 'flowable-messageExpression', component: MessageExpression, isEdited: isTextFieldEntryEdited }
    ];
  } else if (is(definition, 'bpmn:ErrorEventDefinition') && isAny(element, CATCH_EVENTS)) {
    label = 'Error options';
    entries = [
      { id: 'flowable-errorVariableName', component: ErrorVariableName, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-errorVariableTransient', component: ErrorVariableTransient, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-errorVariableLocalScope', component: ErrorVariableLocalScope, isEdited: isCheckboxEntryEdited }
    ];
  } else if (is(definition, 'bpmn:TerminateEventDefinition')) {
    label = 'Terminate options';
    entries = [
      { id: 'flowable-terminateAll', component: TerminateAll, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-terminateMultiInstance', component: TerminateMultiInstance, isEdited: isCheckboxEntryEdited }
    ];
  } else {
    return null;
  }

  return {
    id: 'flowable-eventDefinition',
    label: translate(label),
    component: Group,
    entries
  };
}

/**
 * A variable listener event (<flowable:variableListenerEventDefinition>):
 * a start, boundary or intermediate catch event without a BPMN event
 * definition that fires when a variable changes. Not offered on events that
 * wait for an event registry event.
 */
export function VariableListenerGroup(element, injector) {
  if (!isAny(element, CATCH_EVENTS) || getEventDefinition(element) || getExtensionElement(element.businessObject, 'flowable:EventType')) {
    return null;
  }

  const translate = injector.get('translate');
  const listening = !!getVariableListener(element);

  return {
    id: 'flowable-variableListener',
    label: translate('Variable listener'),
    component: Group,
    entries: [
      { id: 'flowable-variableListener', component: VariableListenerToggle, isEdited: isCheckboxEntryEdited },
      ...(listening ? [
        { id: 'flowable-variableName', component: VariableName, isEdited: isTextFieldEntryEdited },
        { id: 'flowable-variableChangeType', component: VariableChangeType, isEdited: isSelectEntryEdited }
      ] : [])
    ]
  };
}

/**
 * The event registry event a start, boundary or intermediate catch event
 * waits for. Offered on events without a BPMN event definition that are not
 * variable listeners.
 */
export function EventRegistryGroup(element, injector) {
  if (!isEventRegistryEvent(element)) {
    return null;
  }

  const translate = injector.get('translate');

  const entries = [
    { id: 'flowable-eventType', component: EventTypeEntry, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-eventName', component: EventNameEntry, isEdited: isTextFieldEntryEdited }
  ];

  if (is(element, 'bpmn:StartEvent')) {
    entries.push({ id: 'flowable-startEventCorrelationConfiguration', component: StartCorrelationConfiguration, isEdited: isTextFieldEntryEdited });
  }

  return {
    id: 'flowable-eventRegistry',
    label: translate('Event registry'),
    component: Group,
    entries
  };
}

/**
 * Event out parameters: payload fields of the received event stored as
 * variables. On receive tasks and event registry events.
 */
export function EventOutParametersGroup(element, injector) {
  if (!(is(element, 'bpmn:ReceiveTask') || isEventRegistryEvent(element))) {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:EventOutParameter',
    id: 'flowable-eventOut',
    label: 'Event output',
    attributes: [ 'source', 'sourceType', 'target', 'transient' ]
  });
}

/**
 * Event correlation parameters: which received events this element accepts.
 * On receive tasks and event registry events.
 */
export function EventCorrelationGroup(element, injector) {
  if (!(is(element, 'bpmn:ReceiveTask') || isEventRegistryEvent(element))) {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:EventCorrelationParameter',
    id: 'flowable-eventCorrelation',
    label: 'Event correlation',
    attributes: [ 'name', 'value', 'type' ],
    getLabel: parameter => parameter.get('name') || '<empty>'
  });
}

function isEventRegistryEvent(element) {
  return isAny(element, CATCH_EVENTS) && !getEventDefinition(element) && !getVariableListener(element);
}


// event definitions //////////

const definitionTarget = element => getEventDefinition(element);

const BusinessCalendarName = textEntry('flowable:businessCalendarName', 'Business calendar', {
  getTarget: definitionTarget,
  description: 'Calendar used to resolve the timer'
});

const TimeCycleEndDate = textEntry('flowable:endDate', 'Cycle end date', {
  getTarget: element => getEventDefinition(element).get('timeCycle'),
  description: 'ISO 8601 date after which the cycle stops'
});

const SignalExpression = textEntry('flowable:signalExpression', 'Signal expression', {
  getTarget: definitionTarget,
  description: 'Resolves the signal name at runtime, instead of the signal reference'
});

const SignalAsync = checkboxEntry('flowable:async', 'Throw asynchronously', {
  getTarget: definitionTarget,
  tooltip: 'Deliver the signal to the catching executions in separate jobs.'
});

const MessageExpression = textEntry('flowable:messageExpression', 'Message expression', {
  getTarget: definitionTarget,
  description: 'Resolves the message name at runtime, instead of the message reference'
});

const ErrorVariableName = textEntry('flowable:errorVariableName', 'Error variable', {
  getTarget: definitionTarget,
  description: 'Stores the caught error'
});

const ErrorVariableTransient = checkboxEntry('flowable:errorVariableTransient', 'Error variable as transient', {
  getTarget: definitionTarget
});

const ErrorVariableLocalScope = checkboxEntry('flowable:errorVariableLocalScope', 'Error variable in local scope', {
  getTarget: definitionTarget
});

const TerminateAll = checkboxEntry('flowable:terminateAll', 'Terminate all', {
  getTarget: definitionTarget,
  tooltip: 'Terminate the whole process instance, including parent processes.'
});

const TerminateMultiInstance = checkboxEntry('flowable:terminateMultiInstance', 'Terminate multi-instance', {
  getTarget: definitionTarget,
  tooltip: 'Terminate all instances of the enclosing multi-instance activity.'
});


// variable listener //////////

function getVariableListener(element) {
  return getExtensionElement(element.businessObject, 'flowable:VariableListenerEventDefinition');
}

function VariableListenerToggle({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const businessObject = element.businessObject;

  return jsx(CheckboxEntry, {
    element,
    id,
    label: translate('Fire on variable changes'),
    getValue: () => !!getVariableListener(element),
    setValue: checked => {
      const existing = getVariableListener(element);
      const commands = checked
        ? (existing ? [] : addExtensionElementCommands(element, businessObject,
          bpmnFactory.create('flowable:VariableListenerEventDefinition', { variableName: '' }), bpmnFactory))
        : (existing ? removeExtensionElementsCommands(element, businessObject, [ existing ]) : []);

      if (commands.length) {
        commandStack.execute('properties-panel.multi-command-executor', commands);
      }
    }
  });
}

const VariableName = textEntry('variableName', 'Variable name', {
  getTarget: element => getVariableListener(element)
});

function VariableChangeType({ element, id }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const listener = getVariableListener(element);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Change type'),
    getOptions: () => {
      const current = listener.get('variableChangeType');
      const options = [
        { value: '', label: translate('<default: all>') },
        ...CHANGE_TYPES.map(({ value, label }) => ({ value, label: translate(label) }))
      ];

      if (current && !CHANGE_TYPES.some(({ value }) => value === current)) {
        options.push({ value: current, label: current });
      }

      return options;
    },
    getValue: () => listener.get('variableChangeType') || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: listener,
      properties: { variableChangeType: value || undefined }
    })
  });
}


// event registry //////////

const EventTypeEntry = extensionBodyEntry('flowable:EventType', 'Event key', 'Event registry event this element waits for');

const EventNameEntry = extensionBodyEntry('flowable:EventName', 'Event name');

const StartCorrelationConfiguration = extensionBodyEntry('flowable:StartEventCorrelationConfiguration', 'Correlation configuration',
  'For example storeAsUniqueReferenceId, to start one instance per correlation');
