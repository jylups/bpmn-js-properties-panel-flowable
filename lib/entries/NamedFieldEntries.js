import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CheckboxEntry,
  TextAreaEntry,
  TextFieldEntry
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { fieldValueProperties, getFieldValue } from './FieldsEntry.js';

import {
  addExtensionElementCommands,
  getExtensionElementsList,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';

import { expressions } from '../util/Validation.js';


/**
 * Entries for the fields a typed service task reads by name, such as the `to`
 * field of a mail task (<flowable:field name="to">).
 *
 * A value with ${…} or #{…} is stored as an expression, any other value as a
 * string; an edit keeps the form the field already has when it fits. An empty
 * value removes the field.
 */

const EXPRESSION = /[$#]\{/;

/**
 * The <flowable:field> children of a business object's extension elements.
 */
export function getFields(businessObject) {
  return getExtensionElementsList(businessObject, 'flowable:Field');
}

export function getNamedField(businessObject, name) {
  return getFields(businessObject).find(field => field.get('name') === name);
}

/**
 * The value of a named field, '' when there is none.
 */
export function getNamedFieldValue(businessObject, name) {
  const field = getNamedField(businessObject, name);

  return field ? getFieldValue(field).value : '';
}

/**
 * Commands that set a named field: create, update or (for an empty value)
 * remove it.
 */
export function setNamedFieldCommands(element, businessObject, name, value, bpmnFactory) {
  const field = getNamedField(businessObject, name);

  if (value === undefined || value === null || value === '') {
    return field ? removeExtensionElementsCommands(element, businessObject, [ field ]) : [];
  }

  const type = EXPRESSION.test(value) ? 'expression' : 'string';

  if (field) {
    return [ {
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: field, properties: fieldValueProperties(field, type, value, bpmnFactory) }
    } ];
  }

  const newField = bpmnFactory.create('flowable:Field', { name });

  newField.set(type === 'expression' ? 'expressionElement' : 'string',
    type === 'expression' ? bpmnFactory.create('flowable:Expression', { body: value }) : value);

  return addExtensionElementCommands(element, businessObject, newField, bpmnFactory);
}

function useSetField(element, name) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');

  return value => {
    const commands = setNamedFieldCommands(element, element.businessObject, name, value, bpmnFactory);

    if (commands.length) {
      commandStack.execute('properties-panel.multi-command-executor', commands);
    }
  };
}

/**
 * The component for a named field.
 *
 * @param {Object} spec
 * @param {string} spec.name - field name
 * @param {string} spec.label
 * @param {string} [spec.kind] - 'text' (default), 'area' or 'boolean'
 * @param {boolean} [spec.defaultValue] - for 'boolean': the engine default
 * @param {string} [spec.description]
 */
export function NamedFieldEntry(props) {
  const { element, spec } = props;
  const value = getNamedFieldValue(element.businessObject, spec.name);

  // a boolean set to an expression is edited as text, so it is not lost
  if (spec.kind === 'boolean' && (value === '' || value === 'true' || value === 'false')) {
    return jsx(BooleanField, props);
  }

  return jsx(TextField, props);
}

function TextField({ element, id, spec }) {
  const debounce = useService('debounceInput');
  const translate = useService('translate');
  const setField = useSetField(element, spec.name);
  const area = spec.kind === 'area';

  return jsx(area ? TextAreaEntry : TextFieldEntry, {
    element,
    id,
    label: translate(spec.label),
    description: spec.description && translate(spec.description),
    debounce,
    rows: area ? 2 : undefined,
    autoResize: area || undefined,
    validate: value => expressions(value, translate),
    getValue: () => getNamedFieldValue(element.businessObject, spec.name),
    setValue: setField
  });
}

function BooleanField({ element, id, spec }) {
  const translate = useService('translate');
  const setField = useSetField(element, spec.name);
  const defaultValue = !!spec.defaultValue;

  return jsx(CheckboxEntry, {
    element,
    id,
    label: translate(spec.label),
    getValue: () => {
      const value = getNamedFieldValue(element.businessObject, spec.name);

      return value === '' ? defaultValue : value === 'true';
    },
    setValue: checked => setField(checked === defaultValue ? undefined : String(checked))
  });
}
