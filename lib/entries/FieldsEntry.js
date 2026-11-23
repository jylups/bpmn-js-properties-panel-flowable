import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CollapsibleEntry,
  ListEntry,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


/**
 * Field injection (<flowable:field>) as a list entry.
 *
 * A field holds its value in one of four forms Flowable reads: the stringValue
 * or expression attribute, or a <flowable:string> or <flowable:expression>
 * child. Edits keep the form a value already has; new values are written as
 * children, as Flowable's own exporter writes them.
 *
 * @param {Object} props
 * @param {string} props.id
 * @param {djs.model.Base} props.element
 * @param {Function} props.getFields - () => flowable:Field[]
 * @param {Function} props.addField - (field) => void
 * @param {Function} props.removeField - (field) => void
 */
export function FieldsEntry({ id, element, getFields, addField, removeField }) {
  const bpmnFactory = useService('bpmnFactory');
  const translate = useService('translate');

  const fields = getFields();

  return jsx(ListEntry, {
    id,
    element,
    label: translate('Field injection'),
    items: fields,
    component: FieldItem,
    onAdd: () => addField(bpmnFactory.create('flowable:Field', { name: '' })),
    onRemove: field => removeField(field),
    autoFocusEntry: `[data-entry-id="${ id }-field-${ fields.length - 1 }"] input`
  });
}

function FieldItem({ element, id: idPrefix, index, item: field, open }) {
  const fieldId = `${ idPrefix }-field-${ index }`;

  return jsx(CollapsibleEntry, {
    id: fieldId,
    element,
    label: field.get('name') || '<empty>',
    open,
    entries: [
      { id: `${ fieldId }-name`, component: FieldName, field },
      { id: `${ fieldId }-type`, component: FieldType, field },
      { id: `${ fieldId }-value`, component: FieldValue, field }
    ]
  });
}


// value forms //////////

/**
 * The type ('string' or 'expression') and value of a field, whatever form it
 * is stored in.
 */
export function getFieldValue(field) {
  if (field.get('stringValue') !== undefined) {
    return { type: 'string', value: field.get('stringValue'), form: 'stringValue' };
  }

  if (field.get('string') !== undefined) {
    return { type: 'string', value: field.get('string'), form: 'string' };
  }

  if (field.get('expression') !== undefined) {
    return { type: 'expression', value: field.get('expression'), form: 'expression' };
  }

  const expressionElement = field.get('expressionElement');

  if (expressionElement) {
    return { type: 'expression', value: expressionElement.get('body') || '', form: 'expressionElement' };
  }

  return { type: 'string', value: '', form: null };
}

/**
 * The properties that store a value as the given type: the current form when
 * it fits the type, a child otherwise. All other forms are cleared.
 */
export function fieldValueProperties(field, type, value, bpmnFactory) {
  const { type: currentType, form } = getFieldValue(field);

  const properties = {
    stringValue: undefined,
    string: undefined,
    expression: undefined,
    expressionElement: undefined
  };

  if (type === currentType && (form === 'stringValue' || form === 'expression')) {
    properties[form] = value;
  } else if (type === 'expression') {
    properties.expressionElement = bpmnFactory.create('flowable:Expression', { body: value });
  } else {
    properties.string = value;
  }

  return properties;
}


// entries //////////

function FieldName({ element, id, field }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Name'),
    debounce,
    getValue: () => field.get('name') || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: field,
      properties: { name: value || '' }
    })
  });
}

function FieldType({ element, id, field }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Type'),
    getOptions: () => [
      { value: 'string', label: translate('String') },
      { value: 'expression', label: translate('Expression') }
    ],
    getValue: () => getFieldValue(field).type,
    setValue: type => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: field,
      properties: fieldValueProperties(field, type, getFieldValue(field).value, bpmnFactory)
    })
  });
}

function FieldValue({ element, id, field }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextAreaEntry, {
    element,
    id,
    label: translate('Value'),
    debounce,
    rows: 1,
    autoResize: true,
    getValue: () => getFieldValue(field).value,
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: field,
      properties: fieldValueProperties(field, getFieldValue(field).type, value || '', bpmnFactory)
    })
  });
}
