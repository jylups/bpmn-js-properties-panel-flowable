import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  Group,
  ListGroup,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry,
  isSelectEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { textEntry } from '../entries/AttributeEntries.js';

import { getProcess } from './ProcessStartGroups.js';

import {
  addExtensionElementCommands,
  getExtensionElement,
  getExtensionElementsList,
  removeExtensionElementsCommands,
  setExtensionElementBody
} from '../util/ExtensionElementsUtil.js';

import { date, expressions } from '../util/Validation.js';


/**
 * Data object types as Flowable reads them: it strips the prefix and
 * switches on the type name; its exporter writes xsd:<type>.
 */
const DATA_TYPES = [ 'string', 'int', 'long', 'double', 'boolean', 'datetime', 'json' ];


/**
 * A data object's type and default value (inventory section 12), shown on
 * the data object reference that bpmn-js draws for it.
 */
export function DataObjectGroup(element, injector) {
  if (!getDataObject(element)) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-dataObject',
    label: translate('Data object'),
    component: Group,
    entries: [
      { id: 'flowable-dataObjectType', component: DataObjectType, isEdited: isSelectEntryEdited },
      { id: 'flowable-dataObjectValue', component: DataObjectValue, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * The skip expression of a sequence flow.
 */
export function SequenceFlowGroup(element, injector) {
  if (!is(element, 'bpmn:SequenceFlow')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-sequenceFlow',
    label: translate('Sequence flow'),
    component: Group,
    entries: [
      { id: 'flowable-skipExpression', component: SkipExpression, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * Localized names and documentation (<flowable:localization>) of the
 * process, flow elements and data objects.
 */
export function LocalizationGroup(element, injector) {
  const container = getLocalizationContainer(element);

  if (!container) {
    return null;
  }

  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const localizations = getExtensionElementsList(container, 'flowable:Localization');

  return {
    id: 'flowable-localizations',
    label: translate('Localization'),
    component: ListGroup,
    items: localizations.map((localization, index) => {
      const id = `${ element.id }-flowable-localization-${ index }`;

      return {
        id,
        label: [ localization.get('locale') || '?', localization.get('name') ].filter(Boolean).join(': '),
        entries: [
          { id: `${ id }-locale`, component: LocalizationLocale, localization },
          { id: `${ id }-name`, component: LocalizationName, localization },
          { id: `${ id }-documentation`, component: LocalizationDocumentation, localization }
        ],
        autoFocusEntry: `${ id }-locale`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, container, [ localization ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, container, bpmnFactory.create('flowable:Localization', { locale: '' }), bpmnFactory));
    }
  };
}


// data object //////////

/**
 * The data object of a data object reference.
 */
export function getDataObject(element) {
  if (!is(element, 'bpmn:DataObjectReference')) {
    return null;
  }

  return element.businessObject.get('dataObjectRef') || null;
}

function DataObjectType({ element, id }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const dataObject = getDataObject(element);

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Type'),
    getOptions: () => {
      const current = dataObject.get('itemSubjectRef');
      const options = [
        { value: '', label: translate('<none>') },
        ...DATA_TYPES.map(type => ({ value: `xsd:${ type }`, label: type }))
      ];

      if (current && !options.some(({ value }) => value === current)) {
        options.push({ value: current, label: current });
      }

      return options;
    },
    getValue: () => dataObject.get('itemSubjectRef') || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: dataObject,
      properties: { itemSubjectRef: value || undefined }
    })
  });
}

/**
 * The default value, the body of <flowable:value>. Dates use
 * yyyy-MM-dd'T'HH:mm:ss.
 */
function DataObjectValue({ element, id }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const dataObject = getDataObject(element);

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Default value'),
    description: dataObject.get('itemSubjectRef') === 'xsd:datetime' ? translate('yyyy-MM-ddTHH:mm:ss') : undefined,
    debounce,
    validate: value => (dataObject.get('itemSubjectRef') === 'xsd:datetime' ? date : expressions)(value, translate),
    getValue: () => getExtensionElement(dataObject, 'flowable:Value')?.get('body') || '',
    setValue: value => setExtensionElementBody({
      element,
      businessObject: dataObject,
      type: 'flowable:Value',
      value,
      bpmnFactory,
      commandStack
    })
  });
}


// sequence flow //////////

const SkipExpression = textEntry('flowable:skipExpression', 'Skip expression', {
  description: 'Takes the flow without evaluating its condition when true; needs the _FLOWABLE_SKIP_EXPRESSION_ENABLED variable'
});


// localization //////////

function getLocalizationContainer(element) {
  if (isAny(element, [ 'bpmn:Process', 'bpmn:Participant' ])) {
    return getProcess(element);
  }

  if (is(element, 'bpmn:DataObjectReference')) {
    return getDataObject(element);
  }

  if (is(element, 'bpmn:FlowElement')) {
    return element.businessObject;
  }

  return null;
}

const localizationTarget = (element, props) => props.localization;

const LocalizationLocale = textEntry('locale', 'Locale', {
  getTarget: localizationTarget,
  description: 'For example en, de or pt_BR',
  required: true
});

const LocalizationName = textEntry('name', 'Name', { getTarget: localizationTarget });

/**
 * The localized documentation, a <flowable:documentation> child.
 */
function LocalizationDocumentation({ element, id, localization }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextAreaEntry, {
    element,
    id,
    label: translate('Documentation'),
    debounce,
    rows: 2,
    autoResize: true,
    getValue: () => localization.get('documentation')?.get('body') || '',
    setValue: value => {
      const documentation = localization.get('documentation');

      if (value && documentation) {
        commandStack.execute('element.updateModdleProperties', {
          element,
          moddleElement: documentation,
          properties: { body: value }
        });

        return;
      }

      let newDocumentation;

      if (value) {
        newDocumentation = bpmnFactory.create('flowable:Documentation', { body: value });
        newDocumentation.$parent = localization;
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: localization,
        properties: { documentation: newDocumentation }
      });
    }
  });
}
