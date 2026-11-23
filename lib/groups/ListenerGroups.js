import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  ListGroup,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { FieldsEntry } from '../entries/FieldsEntry.js';

import {
  addExtensionElementCommands,
  getExtensionElementsList,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';

import { all, expressions, required } from '../util/Validation.js';


const EXECUTION_EVENTS = [ 'start', 'end' ];

const SEQUENCE_FLOW_EVENTS = [ 'take' ];

const TASK_EVENTS = [ 'create', 'assignment', 'complete', 'delete', 'all' ];

const IMPLEMENTATIONS = [ 'class', 'expression', 'delegateExpression', 'script' ];

const IMPLEMENTATION_LABELS = {
  class: 'Java class',
  expression: 'Expression',
  delegateExpression: 'Delegate expression',
  script: 'Script'
};

const TRANSACTION_PHASES = [ 'before-commit', 'committed', 'rolled-back' ];

const RESOLVERS = {
  customPropertiesResolverClass: 'Java class',
  customPropertiesResolverExpression: 'Expression',
  customPropertiesResolverDelegateExpression: 'Delegate expression'
};

const THROW_EVENTS = {
  signal: 'signalName',
  globalSignal: 'signalName',
  message: 'messageName',
  error: 'errorCode'
};


/**
 * Execution listeners on the process, flow nodes and sequence flows.
 */
export function ExecutionListenersGroup(element, injector) {
  const container = getListenerContainer(element);

  if (!container || !isAny(element, [ 'bpmn:Process', 'bpmn:Participant', 'bpmn:FlowNode', 'bpmn:SequenceFlow' ])) {
    return null;
  }

  const events = is(element, 'bpmn:SequenceFlow') ? SEQUENCE_FLOW_EVENTS : EXECUTION_EVENTS;

  return listenerGroup({
    element,
    injector,
    container,
    type: 'flowable:ExecutionListener',
    id: 'flowable-executionListeners',
    label: 'Execution listeners',
    events
  });
}

/**
 * Task listeners on user tasks.
 */
export function TaskListenersGroup(element, injector) {
  if (!is(element, 'bpmn:UserTask')) {
    return null;
  }

  return listenerGroup({
    element,
    injector,
    container: element.businessObject,
    type: 'flowable:TaskListener',
    id: 'flowable-taskListeners',
    label: 'Task listeners',
    events: TASK_EVENTS
  });
}

/**
 * Engine event listeners on the process.
 */
export function EventListenersGroup(element, injector) {
  const container = getListenerContainer(element);

  if (!container || !isAny(element, [ 'bpmn:Process', 'bpmn:Participant' ])) {
    return null;
  }

  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const listeners = getExtensionElementsList(container, 'flowable:EventListener');

  return {
    id: 'flowable-eventListeners',
    label: translate('Event listeners'),
    component: ListGroup,
    items: listeners.map((listener, index) => {
      const id = `${ element.id }-flowable-eventListener-${ index }`;

      return {
        id,
        label: listener.get('events') || translate('All events'),
        entries: [
          { id: `${ id }-events`, component: EventsEntry, listener },
          { id: `${ id }-entityType`, component: EntityTypeEntry, listener },
          { id: `${ id }-implementation`, component: EventListenerImplementationEntry, listener },
          ...eventListenerValueEntries(id, listener),
          { id: `${ id }-onTransaction`, component: TransactionEntry, listener }
        ],
        autoFocusEntry: `${ id }-events`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, container, [ listener ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      const listener = bpmnFactory.create('flowable:EventListener', { class: '' });

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, container, listener, bpmnFactory));
    }
  };
}


// execution and task listeners //////////

function listenerGroup({ element, injector, container, type, id: groupId, label, events }) {
  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const listeners = getExtensionElementsList(container, type);

  return {
    id: groupId,
    label: translate(label),
    component: ListGroup,
    items: listeners.map((listener, index) => {
      const id = `${ element.id }-${ groupId }-${ index }`;

      return {
        id,
        label: `${ listener.get('event') || '?' }: ${ translate(IMPLEMENTATION_LABELS[getImplementation(listener)]) }`,
        entries: listenerEntries(id, element, listener, events),
        autoFocusEntry: `${ id }-value`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, container, [ listener ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      const listener = bpmnFactory.create(type, { event: events[0], class: '' });

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, container, listener, bpmnFactory));
    }
  };
}

function listenerEntries(id, element, listener, events) {
  const implementation = getImplementation(listener);

  const entries = [
    { id: `${ id }-event`, component: ListenerEventEntry, listener, events },
    { id: `${ id }-implementation`, component: ImplementationEntry, listener }
  ];

  if (implementation === 'script') {
    entries.push(
      { id: `${ id }-scriptLanguage`, component: ScriptLanguageEntry, listener },
      { id: `${ id }-script`, component: ScriptEntry, listener },
      { id: `${ id }-scriptResultVariable`, component: ScriptResultVariableEntry, listener }
    );
  } else {
    entries.push({ id: `${ id }-value`, component: ImplementationValueEntry, listener, implementation });
  }

  entries.push(
    { id: `${ id }-onTransaction`, component: TransactionEntry, listener },
    { id: `${ id }-resolverType`, component: ResolverTypeEntry, listener }
  );

  if (getResolver(listener)) {
    entries.push({ id: `${ id }-resolverValue`, component: ResolverValueEntry, listener });
  }

  if (implementation !== 'script') {
    entries.push({ id: `${ id }-fields`, component: ListenerFieldsEntry, listener });
  }

  return entries;
}

/**
 * The implementation of a listener: class, expression, delegateExpression or
 * script (type="script").
 */
export function getImplementation(listener) {
  if (listener.get('type') === 'script') {
    return 'script';
  }

  return IMPLEMENTATIONS.find(name => name !== 'script' && listener.get(name) !== undefined) || 'class';
}

function getResolver(listener) {
  return Object.keys(RESOLVERS).find(name => listener.get(name) !== undefined);
}

function useUpdate(element, moddleElement) {
  const commandStack = useService('commandStack');

  return properties => commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement,
    properties
  });
}

function ListenerEventEntry({ element, id, listener, events }) {
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Event'),
    getOptions: () => events.map(event => ({ value: event, label: translate(event) })),
    getValue: () => listener.get('event'),
    setValue: value => update({ event: value })
  });
}

function ImplementationEntry({ element, id, listener }) {
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Type'),
    getOptions: () => IMPLEMENTATIONS.map(name => ({ value: name, label: translate(IMPLEMENTATION_LABELS[name]) })),
    getValue: () => getImplementation(listener),
    setValue: value => {
      const properties = { class: undefined, expression: undefined, delegateExpression: undefined, type: undefined, script: undefined };

      if (value === 'script') {
        properties.type = 'script';
        properties.script = bpmnFactory.create('flowable:Script', { language: 'groovy', body: '' });
        properties.fields = [];
      } else {
        properties[value] = '';
      }

      update(properties);
    }
  });
}

function ImplementationValueEntry({ element, id, listener, implementation }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(IMPLEMENTATION_LABELS[implementation]),
    debounce,
    validate: value => all(required, expressions)(value, translate),
    getValue: () => listener.get(implementation) || '',
    setValue: value => update({ [implementation]: value || '' })
  });
}

function ScriptLanguageEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener.get('script'));

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Script language'),
    debounce,
    getValue: () => listener.get('script').get('language') || '',
    setValue: value => update({ language: value || undefined })
  });
}

function ScriptEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener.get('script'));

  return jsx(TextAreaEntry, {
    element,
    id,
    label: translate('Script'),
    debounce,
    rows: 4,
    monospace: true,
    getValue: () => listener.get('script').get('body') || '',
    setValue: value => update({ body: value || '' })
  });
}

function ScriptResultVariableEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener.get('script'));

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Result variable'),
    debounce,
    getValue: () => listener.get('script').get('resultVariable') || '',
    setValue: value => update({ resultVariable: value || undefined })
  });
}

function TransactionEntry({ element, id, listener }) {
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Transaction phase'),
    getOptions: () => [
      { value: '', label: translate('<none>') },
      ...TRANSACTION_PHASES.map(phase => ({ value: phase, label: translate(phase) }))
    ],
    getValue: () => listener.get('onTransaction') || '',
    setValue: value => update({ onTransaction: value || undefined })
  });
}

function ResolverTypeEntry({ element, id, listener }) {
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Custom properties resolver'),
    getOptions: () => [
      { value: '', label: translate('<none>') },
      ...Object.entries(RESOLVERS).map(([ value, label ]) => ({ value, label: translate(label) }))
    ],
    getValue: () => getResolver(listener) || '',
    setValue: value => {
      const current = getResolver(listener);
      const properties = Object.fromEntries(Object.keys(RESOLVERS).map(name => [ name, undefined ]));

      if (value) {
        properties[value] = current ? listener.get(current) : '';
      }

      update(properties);
    }
  });
}

function ResolverValueEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener);
  const resolver = getResolver(listener);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Resolver'),
    debounce,
    getValue: () => listener.get(resolver) || '',
    setValue: value => update({ [resolver]: value || '' })
  });
}

function ListenerFieldsEntry({ element, id, listener }) {
  const commandStack = useService('commandStack');

  const update = fields => commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: listener,
    properties: { fields }
  });

  return jsx(FieldsEntry, {
    id,
    element,
    getFields: () => listener.get('fields'),
    addField: field => {
      field.$parent = listener;
      update([ ...listener.get('fields'), field ]);
    },
    removeField: field => update(listener.get('fields').filter(existing => existing !== field))
  });
}


// event listeners //////////

function getEventListenerImplementation(listener) {
  const throwEvent = listener.get('throwEvent');

  if (throwEvent) {
    return `throw-${ throwEvent }`;
  }

  return listener.get('delegateExpression') !== undefined ? 'delegateExpression' : 'class';
}

function eventListenerValueEntries(id, listener) {
  const implementation = getEventListenerImplementation(listener);

  if (implementation.startsWith('throw-')) {
    return [ { id: `${ id }-throwValue`, component: ThrowValueEntry, listener } ];
  }

  return [ { id: `${ id }-value`, component: EventListenerValueEntry, listener, implementation } ];
}

function EventsEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Events'),
    description: translate('Comma-separated engine event types, for example TASK_CREATED; empty for all'),
    debounce,
    getValue: () => listener.get('events') || '',
    setValue: value => update({ events: value || undefined })
  });
}

function EntityTypeEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Entity type'),
    description: translate('Only entity events of this type, for example task'),
    debounce,
    getValue: () => listener.get('entityType') || '',
    setValue: value => update({ entityType: value || undefined })
  });
}

function EventListenerImplementationEntry({ element, id, listener }) {
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  const options = [
    { value: 'class', label: translate('Java class') },
    { value: 'delegateExpression', label: translate('Delegate expression') },
    { value: 'throw-signal', label: translate('Throw signal') },
    { value: 'throw-globalSignal', label: translate('Throw global signal') },
    { value: 'throw-message', label: translate('Throw message') },
    { value: 'throw-error', label: translate('Throw error') }
  ];

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Type'),
    getOptions: () => options,
    getValue: () => getEventListenerImplementation(listener),
    setValue: value => {
      const properties = {
        class: undefined,
        delegateExpression: undefined,
        throwEvent: undefined,
        signalName: undefined,
        messageName: undefined,
        errorCode: undefined
      };

      if (value.startsWith('throw-')) {
        const throwEvent = value.slice('throw-'.length);

        properties.throwEvent = throwEvent;
        properties[THROW_EVENTS[throwEvent]] = '';
      } else {
        properties[value] = '';
      }

      update(properties);
    }
  });
}

function EventListenerValueEntry({ element, id, listener, implementation }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(IMPLEMENTATION_LABELS[implementation]),
    debounce,
    validate: value => all(required, expressions)(value, translate),
    getValue: () => listener.get(implementation) || '',
    setValue: value => update({ [implementation]: value || '' })
  });
}

function ThrowValueEntry({ element, id, listener }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, listener);
  const property = THROW_EVENTS[listener.get('throwEvent')] || 'signalName';

  const labels = { signalName: 'Signal name', messageName: 'Message name', errorCode: 'Error code' };

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(labels[property]),
    debounce,
    getValue: () => listener.get(property) || '',
    setValue: value => update({ [property]: value || '' })
  });
}


// helpers //////////

/**
 * The business object that holds process-level listeners: the process for a
 * participant, the element's own business object otherwise.
 */
function getListenerContainer(element) {
  const businessObject = element.businessObject;

  if (is(element, 'bpmn:Participant')) {
    return businessObject.get('processRef') || null;
  }

  return businessObject;
}
