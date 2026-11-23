import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CheckboxEntry,
  Group,
  ListGroup,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry,
  isCheckboxEntryEdited,
  isSelectEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { checkboxEntry, textEntry } from '../entries/AttributeEntries.js';

import { FieldsEntry } from '../entries/FieldsEntry.js';

import { NamedFieldEntry, getFields } from '../entries/NamedFieldEntries.js';

import { extensionBodyEntry } from '../entries/ExtensionBodyEntry.js';

import { parameterGroup } from './IOParameterGroups.js';

import {
  addExtensionElementCommands,
  getExtensionElement,
  getExtensionElementsList,
  removeExtensionElementsCommands,
  setExtensionElementBody
} from '../util/ExtensionElementsUtil.js';

import { all, expressions, required } from '../util/Validation.js';


// implementations //////////

const DELEGATES = [ 'class', 'expression', 'delegateExpression' ];

/**
 * The types a send task supports; it has no delegate implementations.
 */
const SEND_TASK_TYPES = [ 'mail', 'camel', 'dmn' ];

const IMPLEMENTATIONS = [
  { value: 'class', label: 'Java class' },
  { value: 'expression', label: 'Expression' },
  { value: 'delegateExpression', label: 'Delegate expression' },
  { value: 'mail', label: 'Mail' },
  { value: 'http', label: 'HTTP' },
  { value: 'shell', label: 'Shell' },
  { value: 'camel', label: 'Camel' },
  { value: 'dmn', label: 'Decision (DMN)' },
  { value: 'case', label: 'Case' },
  { value: 'send-event', label: 'Send event' },
  { value: 'external-worker', label: 'External worker' }
];

/**
 * Attributes that only one implementation type uses; they are removed when the
 * type changes.
 */
const TYPE_ATTRIBUTES = {
  http: [ 'parallelInSameTransaction' ],
  case: [
    'caseDefinitionKey', 'caseInstanceName', 'businessKey', 'inheritBusinessKey',
    'inheritVariables', 'sameDeployment', 'fallbackToDefaultTenant', 'idVariableName'
  ],
  'external-worker': [ 'topic', 'doNotIncludeVariables' ]
};

/**
 * Extension elements that only one implementation type uses.
 */
const TYPE_ELEMENTS = {
  http: [ 'flowable:HttpRequestHandler', 'flowable:HttpResponseHandler' ],
  'external-worker': [ 'flowable:ExternalWorkerInParameter', 'flowable:ExternalWorkerOutParameter' ],
  'send-event': [
    'flowable:EventType', 'flowable:TriggerEventType', 'flowable:SendSynchronously',
    'flowable:EventInParameter', 'flowable:EventOutParameter',
    'flowable:TriggerEventCorrelationParameter', 'flowable:ChannelKey', 'flowable:SystemChannel'
  ]
};

const bool = (name, label, defaultValue = false) => ({ name, label, kind: 'boolean', defaultValue });
const text = (name, label, description) => ({ name, label, description });
const area = (name, label, description) => ({ name, label, kind: 'area', description });

/**
 * The fields each field-based type reads (inventory, service task type fields).
 */
export const TYPE_FIELDS = {
  mail: [
    text('to', 'To'),
    text('from', 'From'),
    text('cc', 'Cc'),
    text('bcc', 'Bcc'),
    text('subject', 'Subject'),
    area('text', 'Text'),
    text('textVar', 'Text variable'),
    area('html', 'HTML'),
    text('htmlVar', 'HTML variable'),
    area('headers', 'Headers'),
    text('charset', 'Charset'),
    text('attachments', 'Attachments', 'Expression resolving to files or data sources'),
    bool('ignoreException', 'Ignore exceptions'),
    text('exceptionVariableName', 'Exception variable')
  ],
  http: [
    text('requestMethod', 'Request method', 'GET, POST, PUT, PATCH or DELETE'),
    text('requestUrl', 'Request URL'),
    area('requestHeaders', 'Request headers', 'One header per line, as Name: value'),
    area('requestSecureHeaders', 'Secure request headers', 'Headers whose values are masked in logs'),
    area('requestBody', 'Request body'),
    text('requestBodyEncoding', 'Request body encoding'),
    text('requestTimeout', 'Request timeout', 'Milliseconds'),
    bool('disallowRedirects', 'Disallow redirects'),
    text('failStatusCodes', 'Fail status codes', 'For example 400, 5XX'),
    text('handleStatusCodes', 'Handle status codes', 'Status codes thrown as BPMN errors'),
    bool('ignoreException', 'Ignore exceptions'),
    bool('saveRequestVariables', 'Save request variables'),
    bool('saveResponseParameters', 'Save response parameters'),
    bool('saveResponseParametersTransient', 'Save response parameters as transient'),
    bool('saveResponseVariableAsJson', 'Save response as JSON'),
    text('responseVariableName', 'Response variable'),
    text('resultVariablePrefix', 'Result variable prefix'),
    text('httpActivityBehaviorClass', 'Behavior class')
  ],
  shell: [
    text('command', 'Command'),
    text('arg1', 'Argument 1'),
    text('arg2', 'Argument 2'),
    text('arg3', 'Argument 3'),
    text('arg4', 'Argument 4'),
    text('arg5', 'Argument 5'),
    text('directory', 'Working directory'),
    bool('wait', 'Wait for the command', true),
    bool('redirectError', 'Redirect errors to the output'),
    bool('cleanEnv', 'Clean environment'),
    text('outputVariable', 'Output variable'),
    text('errorCodeVariable', 'Error code variable')
  ],
  camel: [
    text('camelContext', 'Camel context'),
    text('camelBehaviorClass', 'Behavior class')
  ],
  dmn: [
    text('decisionTableReferenceKey', 'Decision table key'),
    bool('decisionTaskThrowErrorOnNoHits', 'Throw an error on no hits'),
    bool('fallbackToDefaultTenant', 'Fall back to the default tenant'),
    bool('sameDeployment', 'Decision from the same deployment')
  ]
};

const TYPE_LABELS = {
  mail: 'Mail',
  http: 'HTTP',
  shell: 'Shell',
  camel: 'Camel',
  dmn: 'Decision'
};

/**
 * The implementation of a service task: its type (mail, http, …), or class,
 * expression or delegateExpression; '' when none is set.
 */
export function getServiceTaskImplementation(businessObject) {
  const type = businessObject.get('flowable:type');

  if (type || !is(businessObject, 'bpmn:ServiceTask')) {
    return type || '';
  }

  return DELEGATES.find(name => businessObject.get(`flowable:${ name }`) !== undefined) || '';
}


// groups //////////

/**
 * Implementation type and its settings, result variable, triggerable, skip
 * expression and extension ID (inventory section 5).
 */
export function ImplementationGroup(element, injector) {
  if (!is(element, 'bpmn:ServiceTask')) {
    return null;
  }

  const translate = injector.get('translate');
  const businessObject = element.businessObject;
  const implementation = getServiceTaskImplementation(businessObject);

  const entries = [
    { id: 'flowable-implementationType', component: ImplementationTypeEntry, isEdited: isSelectEntryEdited }
  ];

  if (DELEGATES.includes(implementation)) {
    entries.push({ id: 'flowable-implementationValue', component: ImplementationValueEntry, implementation, isEdited: isTextFieldEntryEdited });
  }

  if (implementation === 'expression' || hasResultVariable(businessObject)) {
    entries.push(
      { id: 'flowable-resultVariableName', component: ResultVariableEntry, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-useLocalScopeForResultVariable', component: UseLocalScope, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-storeResultVariableAsTransient', component: StoreTransient, isEdited: isCheckboxEntryEdited }
    );
  }

  if (DELEGATES.includes(implementation) || implementation === 'send-event' || businessObject.get('flowable:triggerable')) {
    entries.push({ id: 'flowable-triggerable', component: Triggerable, isEdited: isCheckboxEntryEdited });
  }

  entries.push(
    { id: 'flowable-skipExpression', component: SkipExpression, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-extensionId', component: ExtensionId, isEdited: isTextFieldEntryEdited }
  );

  return {
    id: 'flowable-implementation',
    label: translate('Implementation'),
    component: Group,
    entries
  };
}

/**
 * The type of a send task: mail, Camel or decision.
 */
export function SendTaskImplementationGroup(element, injector) {
  if (!is(element, 'bpmn:SendTask')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-implementation',
    label: translate('Implementation'),
    component: Group,
    entries: [
      { id: 'flowable-implementationType', component: ImplementationTypeEntry, isEdited: isSelectEntryEdited }
    ]
  };
}

/**
 * The named fields of a mail, HTTP, shell, Camel or DMN task.
 */
export function TypeFieldsGroup(element, injector) {
  if (!isAny(element, [ 'bpmn:ServiceTask', 'bpmn:SendTask' ])) {
    return null;
  }

  const implementation = getServiceTaskImplementation(element.businessObject);
  const fields = TYPE_FIELDS[implementation];

  if (!fields) {
    return null;
  }

  const translate = injector.get('translate');

  const entries = fields.map(spec => ({
    id: `flowable-field-${ spec.name }`,
    component: NamedFieldEntry,
    spec,
    isEdited: spec.kind === 'boolean' ? isCheckboxEntryEdited : isTextFieldEntryEdited
  }));

  if (implementation === 'http') {
    entries.push({ id: 'flowable-parallelInSameTransaction', component: ParallelInSameTransaction, isEdited: isCheckboxEntryEdited });
  }

  return {
    id: `flowable-${ implementation }`,
    label: translate(TYPE_LABELS[implementation]),
    component: Group,
    entries
  };
}

/**
 * Request and response handlers of an HTTP task.
 */
export function HttpHandlersGroup(element, injector) {
  if (!is(element, 'bpmn:ServiceTask') || getServiceTaskImplementation(element.businessObject) !== 'http') {
    return null;
  }

  const translate = injector.get('translate');
  const businessObject = element.businessObject;

  const entries = [];

  for (const [ type, name ] of [ [ 'flowable:HttpRequestHandler', 'httpRequestHandler' ], [ 'flowable:HttpResponseHandler', 'httpResponseHandler' ] ]) {
    const id = `flowable-${ name }`;
    const handler = getExtensionElement(businessObject, type);
    const implementation = handler && getHandlerImplementation(handler);

    entries.push({ id: `${ id }-type`, component: HandlerTypeEntry, handlerType: type, isEdited: isSelectEntryEdited });

    if (implementation === 'script') {
      entries.push(
        { id: `${ id }-scriptLanguage`, component: HandlerScriptLanguage, handler },
        { id: `${ id }-script`, component: HandlerScript, handler }
      );
    } else if (implementation) {
      entries.push(
        { id: `${ id }-value`, component: HandlerValue, handler, implementation },
        { id: `${ id }-fields`, component: HandlerFields, handler }
      );
    }
  }

  return {
    id: 'flowable-httpHandlers',
    label: translate('HTTP handlers'),
    component: Group,
    entries
  };
}

/**
 * Field injection for class and delegate expression implementations, and
 * fields a typed task does not read by name.
 */
export function FieldInjectionGroup(element, injector) {
  if (!isAny(element, [ 'bpmn:ServiceTask', 'bpmn:SendTask' ])) {
    return null;
  }

  const implementation = getServiceTaskImplementation(element.businessObject);
  const otherFields = getOtherFields(element.businessObject);
  const injects = is(element, 'bpmn:ServiceTask') && [ '', 'class', 'delegateExpression' ].includes(implementation);

  if (!injects && !otherFields.length) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-fields',
    label: translate(TYPE_FIELDS[implementation] ? 'Other fields' : 'Field injection'),
    component: Group,
    entries: [
      { id: `${ element.id }-flowable-fields`, component: ServiceTaskFieldsEntry }
    ]
  };
}

/**
 * A case task: the case to start and how it inherits from the process.
 */
export function CaseGroup(element, injector) {
  if (!is(element, 'bpmn:ServiceTask') || getServiceTaskImplementation(element.businessObject) !== 'case') {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-case',
    label: translate('Case'),
    component: Group,
    entries: [
      { id: 'flowable-caseDefinitionKey', component: CaseDefinitionKey, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-caseInstanceName', component: CaseInstanceName, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-businessKey', component: BusinessKey, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-inheritBusinessKey', component: InheritBusinessKey, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-inheritVariables', component: InheritVariables, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-caseSameDeployment', component: CaseSameDeployment, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-fallbackToDefaultTenant', component: FallbackToDefaultTenant, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-idVariableName', component: IdVariableName, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * An external worker task: topic and variables.
 */
export function ExternalWorkerGroup(element, injector) {
  if (!is(element, 'bpmn:ServiceTask') || getServiceTaskImplementation(element.businessObject) !== 'external-worker') {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-externalWorker',
    label: translate('External worker'),
    component: Group,
    entries: [
      { id: 'flowable-topic', component: Topic, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-doNotIncludeVariables', component: DoNotIncludeVariables, isEdited: isCheckboxEntryEdited }
    ]
  };
}

export function ExternalWorkerInGroup(element, injector) {
  if (!is(element, 'bpmn:ServiceTask') || getServiceTaskImplementation(element.businessObject) !== 'external-worker') {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:ExternalWorkerInParameter',
    id: 'flowable-externalWorkerIn',
    label: 'Worker input',
    attributes: [ 'source', 'sourceExpression', 'target', 'transient' ]
  });
}

export function ExternalWorkerOutGroup(element, injector) {
  if (!is(element, 'bpmn:ServiceTask') || getServiceTaskImplementation(element.businessObject) !== 'external-worker') {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:ExternalWorkerOutParameter',
    id: 'flowable-externalWorkerOut',
    label: 'Worker output',
    attributes: [ 'source', 'sourceExpression', 'target', 'transient' ]
  });
}

/**
 * A send event task: the event, its channels and, when triggerable, the event
 * that continues it.
 */
export function SendEventGroup(element, injector) {
  if (!isSendEvent(element)) {
    return null;
  }

  const translate = injector.get('translate');

  const entries = [
    { id: 'flowable-eventType', component: EventTypeEntry, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-channelKey', component: ChannelKeyEntry, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-systemChannel', component: SystemChannelEntry, isEdited: isCheckboxEntryEdited },
    { id: 'flowable-sendSynchronously', component: SendSynchronouslyEntry, isEdited: isCheckboxEntryEdited }
  ];

  if (element.businessObject.get('flowable:triggerable')) {
    entries.push({ id: 'flowable-triggerEventType', component: TriggerEventTypeEntry, isEdited: isTextFieldEntryEdited });
  }

  return {
    id: 'flowable-sendEvent',
    label: translate('Send event'),
    component: Group,
    entries
  };
}

export function EventInGroup(element, injector) {
  if (!isSendEvent(element)) {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:EventInParameter',
    id: 'flowable-eventIn',
    label: 'Event payload',
    attributes: [ 'source', 'sourceExpression', 'target', 'targetType' ]
  });
}

export function EventOutGroup(element, injector) {
  if (!isSendEvent(element) || !element.businessObject.get('flowable:triggerable')) {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:EventOutParameter',
    id: 'flowable-eventOut',
    label: 'Trigger event output',
    attributes: [ 'source', 'sourceType', 'target', 'transient' ]
  });
}

export function TriggerCorrelationGroup(element, injector) {
  if (!isSendEvent(element) || !element.businessObject.get('flowable:triggerable')) {
    return null;
  }

  return parameterGroup({
    element,
    injector,
    type: 'flowable:TriggerEventCorrelationParameter',
    id: 'flowable-triggerCorrelation',
    label: 'Trigger correlation',
    attributes: [ 'name', 'value', 'type' ],
    getLabel: parameter => parameter.get('name') || '<empty>'
  });
}

/**
 * Java exceptions mapped to BPMN errors (<flowable:mapException>), on service
 * tasks and call activities.
 */
export function MapExceptionsGroup(element, injector) {
  if (!isAny(element, [ 'bpmn:ServiceTask', 'bpmn:CallActivity' ])) {
    return null;
  }

  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const businessObject = element.businessObject;
  const mappings = getExtensionElementsList(businessObject, 'flowable:MapException');

  return {
    id: 'flowable-mapExceptions',
    label: translate('Exception mapping'),
    component: ListGroup,
    items: mappings.map((mapping, index) => {
      const id = `${ element.id }-flowable-mapException-${ index }`;

      return {
        id,
        label: `${ mapping.get('body') || translate('All exceptions') } → ${ mapping.get('errorCode') || '?' }`,
        entries: [
          { id: `${ id }-errorCode`, component: MapErrorCode, mapping },
          { id: `${ id }-class`, component: MapClass, mapping },
          { id: `${ id }-includeChildExceptions`, component: MapIncludeChildren, mapping },
          { id: `${ id }-rootCause`, component: MapRootCause, mapping }
        ],
        autoFocusEntry: `${ id }-errorCode`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, businessObject, [ mapping ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, businessObject, bpmnFactory.create('flowable:MapException', { errorCode: '' }), bpmnFactory));
    }
  };
}


// implementation //////////

function ImplementationTypeEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const businessObject = element.businessObject;

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Type'),
    getOptions: () => {
      const current = getServiceTaskImplementation(businessObject);
      const offered = is(element, 'bpmn:SendTask')
        ? IMPLEMENTATIONS.filter(({ value }) => SEND_TASK_TYPES.includes(value))
        : IMPLEMENTATIONS;

      const options = [
        { value: '', label: translate('<none>') },
        ...offered.map(({ value, label }) => ({ value, label: translate(label) }))
      ];

      // keep a type this editor does not know, such as mule
      if (current && !offered.some(({ value }) => value === current)) {
        options.push({ value: current, label: current });
      }

      return options;
    },
    validate: value => required(value, translate) && translate('Choose how the task is implemented.'),
    getValue: () => getServiceTaskImplementation(businessObject),
    setValue: value => commandStack.execute('properties-panel.multi-command-executor',
      changeImplementationCommands(element, value))
  });
}

/**
 * Commands that switch a service or send task to another implementation, dropping the
 * attributes, fields and extension elements only the previous one used.
 */
export function changeImplementationCommands(element, value) {
  const businessObject = element.businessObject;
  const previous = getServiceTaskImplementation(businessObject);

  // send tasks only have a type
  const properties = is(element, 'bpmn:ServiceTask') ? {
    'flowable:class': undefined,
    'flowable:expression': undefined,
    'flowable:delegateExpression': undefined,
    'flowable:type': undefined
  } : { 'flowable:type': undefined };

  for (const attribute of TYPE_ATTRIBUTES[previous] || []) {
    properties[`flowable:${ attribute }`] = undefined;
  }

  if (DELEGATES.includes(value)) {
    properties[`flowable:${ value }`] = '';
  } else if (value) {
    properties['flowable:type'] = value;
  }

  const commands = [ {
    cmd: 'element.updateModdleProperties',
    context: { element, moddleElement: businessObject, properties }
  } ];

  const previousFieldNames = (TYPE_FIELDS[previous] || []).map(spec => spec.name);
  const toRemove = [
    ...getFields(businessObject).filter(field => previousFieldNames.includes(field.get('name'))),
    ...(TYPE_ELEMENTS[previous] || []).flatMap(type => getExtensionElementsList(businessObject, type))
  ];

  if (toRemove.length) {
    commands.push(...removeExtensionElementsCommands(element, businessObject, toRemove));
  }

  return commands;
}

function ImplementationValueEntry({ element, id, implementation }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const label = IMPLEMENTATIONS.find(({ value }) => value === implementation).label;

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(label),
    debounce,
    validate: value => all(required, expressions)(value, translate),
    getValue: () => element.businessObject.get(`flowable:${ implementation }`) || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: element.businessObject,
      properties: { [`flowable:${ implementation }`]: value || '' }
    })
  });
}

function hasResultVariable(businessObject) {
  return [ 'resultVariableName', 'resultVariable' ].some(name => businessObject.get(`flowable:${ name }`) !== undefined);
}

/**
 * The result variable. Flowable also reads the older resultVariable alias;
 * editing writes resultVariableName and drops the alias.
 */
function ResultVariableEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const businessObject = element.businessObject;

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Result variable'),
    debounce,
    getValue: () => businessObject.get('flowable:resultVariableName') ?? businessObject.get('flowable:resultVariable') ?? '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: businessObject,
      properties: { 'flowable:resultVariableName': value || undefined, 'flowable:resultVariable': undefined }
    })
  });
}

const UseLocalScope = checkboxEntry('flowable:useLocalScopeForResultVariable', 'Result variable in local scope');

const StoreTransient = checkboxEntry('flowable:storeResultVariableAsTransient', 'Result variable as transient');

const Triggerable = checkboxEntry('flowable:triggerable', 'Triggerable', {
  tooltip: 'The task waits until it is triggered after its implementation ran.'
});

const SkipExpression = textEntry('flowable:skipExpression', 'Skip expression', {
  description: 'Skips the task when true; needs the _FLOWABLE_SKIP_EXPRESSION_ENABLED variable'
});

const ExtensionId = textEntry('flowable:extensionId', 'Extension ID');

const ParallelInSameTransaction = checkboxEntry('flowable:parallelInSameTransaction', 'Parallel in the same transaction', {
  tooltip: 'Run the request in parallel with other HTTP tasks of the same transaction.'
});


// fields //////////

function getOtherFields(businessObject) {
  const known = (TYPE_FIELDS[getServiceTaskImplementation(businessObject)] || []).map(spec => spec.name);

  return getFields(businessObject).filter(field => !known.includes(field.get('name')));
}

function ServiceTaskFieldsEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const businessObject = element.businessObject;

  return jsx(FieldsEntry, {
    id,
    element,
    getFields: () => getOtherFields(businessObject),
    addField: field => commandStack.execute('properties-panel.multi-command-executor',
      addExtensionElementCommands(element, businessObject, field, bpmnFactory)),
    removeField: field => commandStack.execute('properties-panel.multi-command-executor',
      removeExtensionElementsCommands(element, businessObject, [ field ]))
  });
}


// HTTP handlers //////////

const HANDLER_IMPLEMENTATIONS = [
  { value: 'class', label: 'Java class' },
  { value: 'delegateExpression', label: 'Delegate expression' },
  { value: 'script', label: 'Script' }
];

function getHandlerImplementation(handler) {
  if (handler.get('type') === 'script') {
    return 'script';
  }

  return handler.get('delegateExpression') !== undefined ? 'delegateExpression' : 'class';
}

function HandlerTypeEntry({ element, id, handlerType }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const businessObject = element.businessObject;
  const isRequest = handlerType === 'flowable:HttpRequestHandler';

  return jsx(SelectEntry, {
    element,
    id,
    label: translate(isRequest ? 'Request handler' : 'Response handler'),
    getOptions: () => [
      { value: '', label: translate('<none>') },
      ...HANDLER_IMPLEMENTATIONS.map(({ value, label }) => ({ value, label: translate(label) }))
    ],
    getValue: () => {
      const handler = getExtensionElement(businessObject, handlerType);

      return handler ? getHandlerImplementation(handler) : '';
    },
    setValue: value => {
      const handler = getExtensionElement(businessObject, handlerType);
      let commands;

      if (!value) {
        commands = handler ? removeExtensionElementsCommands(element, businessObject, [ handler ]) : [];
      } else {
        const properties = value === 'script'
          ? { type: 'script', script: bpmnFactory.create('flowable:Script', { language: 'groovy', body: '' }), fields: [] }
          : { [value]: '' };

        if (handler) {
          commands = [ {
            cmd: 'element.updateModdleProperties',
            context: {
              element,
              moddleElement: handler,
              properties: { class: undefined, delegateExpression: undefined, type: undefined, script: undefined, ...properties }
            }
          } ];
        } else {
          commands = addExtensionElementCommands(element, businessObject, bpmnFactory.create(handlerType, properties), bpmnFactory);
        }
      }

      if (commands.length) {
        commandStack.execute('properties-panel.multi-command-executor', commands);
      }
    }
  });
}

function useUpdate(element, moddleElement) {
  const commandStack = useService('commandStack');

  return properties => commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement,
    properties
  });
}

function HandlerValue({ element, id, handler, implementation }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, handler);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(implementation === 'class' ? 'Java class' : 'Delegate expression'),
    debounce,
    getValue: () => handler.get(implementation) || '',
    setValue: value => update({ [implementation]: value || '' })
  });
}

function HandlerScriptLanguage({ element, id, handler }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, handler.get('script'));

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Script language'),
    debounce,
    getValue: () => handler.get('script').get('language') || '',
    setValue: value => update({ language: value || undefined })
  });
}

function HandlerScript({ element, id, handler }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const update = useUpdate(element, handler.get('script'));

  return jsx(TextAreaEntry, {
    element,
    id,
    label: translate('Script'),
    debounce,
    rows: 4,
    monospace: true,
    getValue: () => handler.get('script').get('body') || '',
    setValue: value => update({ body: value || '' })
  });
}

function HandlerFields({ element, id, handler }) {
  const update = useUpdate(element, handler);

  return jsx(FieldsEntry, {
    id,
    element,
    getFields: () => handler.get('fields'),
    addField: field => {
      field.$parent = handler;
      update({ fields: [ ...handler.get('fields'), field ] });
    },
    removeField: field => update({ fields: handler.get('fields').filter(f => f !== field) })
  });
}


// case //////////

const CaseDefinitionKey = textEntry('flowable:caseDefinitionKey', 'Case definition key');

const CaseInstanceName = textEntry('flowable:caseInstanceName', 'Case instance name');

const BusinessKey = textEntry('flowable:businessKey', 'Business key');

const InheritBusinessKey = checkboxEntry('flowable:inheritBusinessKey', 'Inherit business key');

const InheritVariables = checkboxEntry('flowable:inheritVariables', 'Inherit variables');

const CaseSameDeployment = checkboxEntry('flowable:sameDeployment', 'Case from the same deployment');

const FallbackToDefaultTenant = checkboxEntry('flowable:fallbackToDefaultTenant', 'Fall back to the default tenant');

const IdVariableName = textEntry('flowable:idVariableName', 'Case instance ID variable');


// external worker //////////

const Topic = textEntry('flowable:topic', 'Topic');

const DoNotIncludeVariables = checkboxEntry('flowable:doNotIncludeVariables', 'Do not include variables', {
  tooltip: 'Send only the mapped input to the worker, not all process variables.'
});


// send event //////////

function isSendEvent(element) {
  return is(element, 'bpmn:ServiceTask') && getServiceTaskImplementation(element.businessObject) === 'send-event';
}

const EventTypeEntry = extensionBodyEntry('flowable:EventType', 'Event key');

const TriggerEventTypeEntry = extensionBodyEntry('flowable:TriggerEventType', 'Trigger event key', 'Event that continues the task');

const ChannelKeyEntry = extensionBodyEntry('flowable:ChannelKey', 'Channel keys', 'Comma-separated');

function SendSynchronouslyEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  return jsx(CheckboxEntry, {
    element,
    id,
    label: translate('Send synchronously'),
    getValue: () => getExtensionElement(element.businessObject, 'flowable:SendSynchronously')?.get('body') === 'true',
    setValue: checked => setExtensionElementBody({
      element,
      type: 'flowable:SendSynchronously',
      value: checked ? 'true' : undefined,
      bpmnFactory,
      commandStack
    })
  });
}

function SystemChannelEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const businessObject = element.businessObject;

  return jsx(CheckboxEntry, {
    element,
    id,
    label: translate('System channel'),
    getValue: () => !!getExtensionElement(businessObject, 'flowable:SystemChannel'),
    setValue: checked => {
      const existing = getExtensionElement(businessObject, 'flowable:SystemChannel');
      const commands = checked
        ? (existing ? [] : addExtensionElementCommands(element, businessObject, bpmnFactory.create('flowable:SystemChannel'), bpmnFactory))
        : (existing ? removeExtensionElementsCommands(element, businessObject, [ existing ]) : []);

      if (commands.length) {
        commandStack.execute('properties-panel.multi-command-executor', commands);
      }
    }
  });
}


// exception mapping //////////

const mappingTarget = (element, props) => props.mapping;

const MapErrorCode = textEntry('errorCode', 'Error code', { getTarget: mappingTarget, required: true });

const MapClass = textEntry('body', 'Exception class', {
  getTarget: mappingTarget,
  description: 'Empty maps every exception'
});

const MapIncludeChildren = checkboxEntry('includeChildExceptions', 'Include subclasses', { getTarget: mappingTarget });

const MapRootCause = textEntry('rootCause', 'Root cause class', { getTarget: mappingTarget });
