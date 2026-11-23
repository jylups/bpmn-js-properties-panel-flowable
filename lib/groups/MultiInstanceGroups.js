import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CollapsibleEntry,
  Group,
  ListEntry,
  ListGroup,
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
  getExtensionElementsList,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';


/**
 * The multi-instance loop characteristics of an element, if any.
 */
export function getMultiInstance(element) {
  const loop = element.businessObject.get('loopCharacteristics');

  return loop && is(loop, 'bpmn:MultiInstanceLoopCharacteristics') ? loop : null;
}

/**
 * Collection, element and index variables and async leave of a
 * multi-instance activity (inventory section 10). Cardinality and the
 * completion condition stay in the bpmn.io multi-instance group.
 */
export function MultiInstanceGroup(element, injector) {
  const loop = getMultiInstance(element);

  if (!loop) {
    return null;
  }

  const translate = injector.get('translate');
  const source = getCollectionSource(loop);

  const entries = [
    { id: 'flowable-collectionSource', component: CollectionSourceEntry, isEdited: isSelectEntryEdited }
  ];

  if (source === 'attribute') {
    entries.push({ id: 'flowable-collection', component: CollectionAttribute, isEdited: isTextFieldEntryEdited });
  }

  if (source === 'handler') {
    entries.push(
      { id: 'flowable-collectionHandlerType', component: HandlerTypeEntry, isEdited: isSelectEntryEdited },
      { id: 'flowable-collectionHandler', component: HandlerValueEntry, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-collectionInputType', component: HandlerInputTypeEntry, isEdited: isSelectEntryEdited },
      { id: 'flowable-collectionInput', component: HandlerInputEntry, isEdited: isTextFieldEntryEdited }
    );
  }

  entries.push(
    { id: 'flowable-elementVariable', component: ElementVariable, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-elementIndexVariable', component: ElementIndexVariable, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-noWaitStatesAsyncLeave', component: NoWaitStatesAsyncLeave, isEdited: isCheckboxEntryEdited }
  );

  return {
    id: 'flowable-multiInstance',
    label: translate('Multi-instance collection'),
    component: Group,
    entries
  };
}

/**
 * Variable aggregations (<flowable:variableAggregation>): variables of each
 * instance collected into one variable of the parent.
 */
export function VariableAggregationsGroup(element, injector) {
  const loop = getMultiInstance(element);

  if (!loop) {
    return null;
  }

  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const aggregations = getExtensionElementsList(loop, 'flowable:VariableAggregation');

  return {
    id: 'flowable-variableAggregations',
    label: translate('Variable aggregations'),
    component: ListGroup,
    items: aggregations.map((aggregation, index) => {
      const id = `${ element.id }-flowable-variableAggregation-${ index }`;
      const implementation = getAggregationImplementation(aggregation);

      return {
        id,
        label: aggregation.get('target') || aggregation.get('targetExpression') || translate('<empty>'),
        entries: [
          { id: `${ id }-target`, component: AggregationTarget, aggregation },
          { id: `${ id }-targetExpression`, component: AggregationTargetExpression, aggregation },
          { id: `${ id }-implementation`, component: AggregationImplementationEntry, aggregation },
          ...(implementation ? [ { id: `${ id }-value`, component: AggregationValueEntry, aggregation, implementation } ] : []),
          { id: `${ id }-storeAsTransientVariable`, component: AggregationTransient, aggregation },
          { id: `${ id }-createOverviewVariable`, component: AggregationOverview, aggregation },
          { id: `${ id }-variables`, component: AggregationVariablesEntry, aggregation }
        ],
        autoFocusEntry: `${ id }-target`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, loop, [ aggregation ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, loop, bpmnFactory.create('flowable:VariableAggregation', { target: '' }), bpmnFactory));
    }
  };
}


// collection //////////

/**
 * Where the collection comes from: the collection attribute (a variable name
 * or an expression), a <flowable:collection> handler, or nothing.
 */
function getCollectionSource(loop) {
  if (getExtensionElement(loop, 'flowable:Collection')) {
    return 'handler';
  }

  return loop.get('flowable:collection') !== undefined ? 'attribute' : '';
}

const loopTarget = element => getMultiInstance(element);

const handlerTarget = element => getExtensionElement(getMultiInstance(element), 'flowable:Collection');

function useExecute() {
  const commandStack = useService('commandStack');

  return commands => commands.length && commandStack.execute('properties-panel.multi-command-executor', commands);
}

function CollectionSourceEntry({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');
  const execute = useExecute();
  const loop = getMultiInstance(element);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Collection'),
    getOptions: () => [
      { value: '', label: translate('<none>') },
      { value: 'attribute', label: translate('Variable or expression') },
      { value: 'handler', label: translate('Collection handler') }
    ],
    getValue: () => getCollectionSource(loop),
    setValue: value => {
      const handler = getExtensionElement(loop, 'flowable:Collection');
      const commands = [];

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: { element, moddleElement: loop, properties: { 'flowable:collection': value === 'attribute' ? '' : undefined } }
      });

      if (handler && value !== 'handler') {
        commands.push(...removeExtensionElementsCommands(element, loop, [ handler ]));
      }

      if (!handler && value === 'handler') {
        commands.push(...addExtensionElementCommands(element, loop, bpmnFactory.create('flowable:Collection', { class: '' }), bpmnFactory));
      }

      execute(commands);
    }
  });
}

const CollectionAttribute = textEntry('flowable:collection', 'Collection variable or expression', {
  getTarget: loopTarget,
  description: 'A variable name, or an expression such as ${order.items}'
});

function getHandlerType(handler) {
  return handler.get('delegateExpression') !== undefined ? 'delegateExpression' : 'class';
}

function HandlerTypeEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const handler = handlerTarget(element);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Handler type'),
    getOptions: () => [
      { value: 'class', label: translate('Java class') },
      { value: 'delegateExpression', label: translate('Delegate expression') }
    ],
    getValue: () => getHandlerType(handler),
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: handler,
      properties: { class: undefined, delegateExpression: undefined, [value]: handler.get(getHandlerType(handler)) || '' }
    })
  });
}

function HandlerValueEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const handler = handlerTarget(element);
  const type = getHandlerType(handler);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(type === 'class' ? 'Handler class' : 'Handler delegate expression'),
    debounce,
    getValue: () => handler.get(type) || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: handler,
      properties: { [type]: value || '' }
    })
  });
}

/**
 * The handler input is a <flowable:string> or <flowable:expression> child.
 */
function getHandlerInputType(handler) {
  return handler.get('expression') !== undefined ? 'expression' : 'string';
}

function HandlerInputTypeEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const handler = handlerTarget(element);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Handler input type'),
    getOptions: () => [
      { value: 'string', label: translate('String') },
      { value: 'expression', label: translate('Expression') }
    ],
    getValue: () => getHandlerInputType(handler),
    setValue: value => {
      const current = handler.get(getHandlerInputType(handler));

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: handler,
        properties: { string: undefined, expression: undefined, [value]: current }
      });
    }
  });
}

function HandlerInputEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const handler = handlerTarget(element);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Handler input'),
    debounce,
    getValue: () => handler.get(getHandlerInputType(handler)) || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: handler,
      properties: { [getHandlerInputType(handler)]: value || undefined }
    })
  });
}

const ElementVariable = textEntry('flowable:elementVariable', 'Element variable', {
  getTarget: loopTarget,
  description: 'Holds the collection element of each instance'
});

const ElementIndexVariable = textEntry('flowable:elementIndexVariable', 'Element index variable', {
  getTarget: loopTarget
});

const NoWaitStatesAsyncLeave = checkboxEntry('flowable:noWaitStatesAsyncLeave', 'Async leave without wait states', {
  getTarget: loopTarget,
  tooltip: 'Leave asynchronously even when the instances have no wait states.'
});


// variable aggregations //////////

const aggregationTarget = (element, props) => props.aggregation;

const AggregationTarget = textEntry('target', 'Target variable', { getTarget: aggregationTarget });

const AggregationTargetExpression = textEntry('targetExpression', 'Target expression', { getTarget: aggregationTarget });

const AggregationTransient = checkboxEntry('storeAsTransientVariable', 'Store as transient variable', { getTarget: aggregationTarget });

const AggregationOverview = checkboxEntry('createOverviewVariable', 'Create overview variable', { getTarget: aggregationTarget });

function getAggregationImplementation(aggregation) {
  return [ 'class', 'delegateExpression' ].find(name => aggregation.get(name) !== undefined) || '';
}

function AggregationImplementationEntry({ element, id, aggregation }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Aggregator'),
    getOptions: () => [
      { value: '', label: translate('Default (JSON)') },
      { value: 'class', label: translate('Java class') },
      { value: 'delegateExpression', label: translate('Delegate expression') }
    ],
    getValue: () => getAggregationImplementation(aggregation),
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: aggregation,
      properties: { class: undefined, delegateExpression: undefined, ...(value ? { [value]: '' } : {}) }
    })
  });
}

function AggregationValueEntry({ element, id, aggregation, implementation }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(implementation === 'class' ? 'Aggregator class' : 'Aggregator delegate expression'),
    debounce,
    getValue: () => aggregation.get(implementation) || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: aggregation,
      properties: { [implementation]: value || '' }
    })
  });
}

/**
 * The <variable> children (unprefixed, as Flowable reads them) of an
 * aggregation.
 */
function AggregationVariablesEntry({ element, id, aggregation }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  const variables = aggregation.get('bpmn:variable');

  const setVariables = newVariables => commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: aggregation,
    properties: { 'bpmn:variable': newVariables }
  });

  return jsx(ListEntry, {
    id,
    element,
    label: translate('Variables'),
    items: variables,
    component: AggregationVariableItem,
    onAdd: () => {
      const variable = bpmnFactory.create('flowable:Variable', { source: '' });

      variable.$parent = aggregation;

      setVariables([ ...variables, variable ]);
    },
    onRemove: variable => setVariables(variables.filter(v => v !== variable)),
    autoFocusEntry: `[data-entry-id="${ id }-variable-${ variables.length - 1 }"] input`
  });
}

function AggregationVariableItem({ element, id: idPrefix, index, item: variable, open }) {
  const id = `${ idPrefix }-variable-${ index }`;
  const source = variable.get('source') || variable.get('sourceExpression') || '?';
  const target = variable.get('target') || variable.get('targetExpression') || source;

  return jsx(CollapsibleEntry, {
    id,
    element,
    label: `${ source } → ${ target }`,
    open,
    entries: [ 'source', 'sourceExpression', 'target', 'targetExpression' ].map(property => ({
      id: `${ id }-${ property }`,
      component: VariableAttributeEntry,
      variable,
      property
    }))
  });
}

const VARIABLE_LABELS = {
  source: 'Source',
  sourceExpression: 'Source expression',
  target: 'Target',
  targetExpression: 'Target expression'
};

function VariableAttributeEntry({ element, id, variable, property }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(VARIABLE_LABELS[property]),
    debounce,
    getValue: () => variable.get(property) || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: variable,
      properties: { [property]: value || undefined }
    })
  });
}
