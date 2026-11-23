import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CollapsibleEntry,
  ListEntry,
  ListGroup,
  SelectEntry,
  TextFieldEntry
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { isAny } from 'bpmn-js/lib/util/ModelUtil';

import { checkboxEntry, textEntry } from '../entries/AttributeEntries.js';

import {
  addExtensionElementCommands,
  getExtensionElementsList,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';


const FORM_TYPES = [ 'string', 'long', 'double', 'boolean', 'date', 'enum' ];


/**
 * Form properties (<flowable:formProperty>) of start events and user tasks
 * (inventory section 3): one item per property, with enum values for the
 * enum type and the date pattern for the date type.
 */
export function FormPropertiesGroup(element, injector) {
  if (!isAny(element, [ 'bpmn:StartEvent', 'bpmn:UserTask' ])) {
    return null;
  }

  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const businessObject = element.businessObject;
  const properties = getExtensionElementsList(businessObject, 'flowable:FormProperty');

  return {
    id: 'flowable-formProperties',
    label: translate('Form properties'),
    component: ListGroup,
    items: properties.map((property, index) => {
      const id = `${ element.id }-flowable-formProperty-${ index }`;

      return {
        id,
        label: property.get('name') || property.get('id') || translate('<empty>'),
        entries: formPropertyEntries(id, property),
        autoFocusEntry: `${ id }-id`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, businessObject, [ property ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      const property = bpmnFactory.create('flowable:FormProperty', { id: '' });

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, businessObject, property, bpmnFactory));
    }
  };
}

function formPropertyEntries(id, property) {
  const type = property.get('type');

  return [
    { id: `${ id }-id`, component: PropertyId, property },
    { id: `${ id }-name`, component: PropertyName, property },
    { id: `${ id }-type`, component: PropertyType, property },
    ...(type === 'date' ? [
      { id: `${ id }-datePattern`, component: DatePattern, property },
      { id: `${ id }-lenientDateParsing`, component: LenientDateParsing, property }
    ] : []),
    ...(type === 'enum' ? [
      { id: `${ id }-values`, component: EnumValuesEntry, property }
    ] : []),
    { id: `${ id }-variable`, component: Variable, property },
    { id: `${ id }-expression`, component: Expression, property },
    { id: `${ id }-default`, component: Default, property },
    { id: `${ id }-readable`, component: Readable, property },
    { id: `${ id }-writable`, component: Writable, property },
    { id: `${ id }-required`, component: Required, property }
  ];
}


// form property //////////

const propertyTarget = (element, props) => props.property;

const PropertyId = textEntry('id', 'ID', { getTarget: propertyTarget });

const PropertyName = textEntry('name', 'Name', { getTarget: propertyTarget });

const Variable = textEntry('variable', 'Variable', {
  getTarget: propertyTarget,
  description: 'Process variable to store the value in; defaults to the ID'
});

const Expression = textEntry('expression', 'Expression', {
  getTarget: propertyTarget,
  description: 'Reads and writes the value through an expression'
});

const Default = textEntry('default', 'Default value', { getTarget: propertyTarget });

const DatePattern = textEntry('datePattern', 'Date pattern', {
  getTarget: propertyTarget,
  description: 'For example dd-MM-yyyy'
});

const LenientDateParsing = checkboxEntry('lenientDateParsing', 'Lenient date parsing', { getTarget: propertyTarget });

const Readable = checkboxEntry('readable', 'Readable', { getTarget: propertyTarget, defaultValue: true });

const Writable = checkboxEntry('writable', 'Writable', { getTarget: propertyTarget, defaultValue: true });

const Required = checkboxEntry('required', 'Required', { getTarget: propertyTarget });

/**
 * The type, with the built-in form types. A custom type registered in the
 * engine is kept and offered as it is.
 */
function PropertyType({ element, id, property }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Type'),
    getOptions: () => {
      const current = property.get('type');
      const types = current && !FORM_TYPES.includes(current) ? [ ...FORM_TYPES, current ] : FORM_TYPES;

      return [
        { value: '', label: translate('<none>') },
        ...types.map(type => ({ value: type, label: type }))
      ];
    },
    getValue: () => property.get('type') || '',
    setValue: value => {
      const properties = { type: value || undefined };

      // drop what only the previous type used
      if (value !== 'date') {
        Object.assign(properties, { datePattern: undefined, lenientDateParsing: undefined });
      }

      if (value !== 'enum') {
        properties.values = [];
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: property,
        properties
      });
    }
  });
}


// enum values //////////

function EnumValuesEntry({ element, id, property }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  const values = property.get('values');

  const setValues = newValues => commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: property,
    properties: { values: newValues }
  });

  return jsx(ListEntry, {
    id,
    element,
    label: translate('Values'),
    items: values,
    component: EnumValueItem,
    onAdd: () => {
      const value = bpmnFactory.create('flowable:Value', { id: '', name: '' });

      value.$parent = property;

      setValues([ ...values, value ]);
    },
    onRemove: value => setValues(values.filter(v => v !== value)),
    autoFocusEntry: `[data-entry-id="${ id }-value-${ values.length - 1 }"] input`
  });
}

function EnumValueItem({ element, id: idPrefix, index, item: value, open }) {
  const valueId = `${ idPrefix }-value-${ index }`;

  return jsx(CollapsibleEntry, {
    id: valueId,
    element,
    label: value.get('name') || value.get('id') || '<empty>',
    open,
    entries: [
      { id: `${ valueId }-id`, component: EnumValueAttribute, value, property: 'id', label: 'ID' },
      { id: `${ valueId }-name`, component: EnumValueAttribute, value, property: 'name', label: 'Name' }
    ]
  });
}

function EnumValueAttribute({ element, id, value, property, label }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate(label),
    debounce,
    getValue: () => value.get(property) || '',
    setValue: newValue => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: value,
      properties: { [property]: newValue || '' }
    })
  });
}
