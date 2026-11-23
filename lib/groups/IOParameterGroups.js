import { ListGroup } from '@bpmn-io/properties-panel';

import { checkboxEntry, textEntry } from '../entries/AttributeEntries.js';

import {
  addExtensionElementCommands,
  getExtensionElementsList,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';


const parameterTarget = (element, props) => props.parameter;

const ATTRIBUTE_ENTRIES = {
  source: textEntry('source', 'Source', { getTarget: parameterTarget }),
  sourceExpression: textEntry('sourceExpression', 'Source expression', { getTarget: parameterTarget }),
  sourceType: textEntry('sourceType', 'Source type', { getTarget: parameterTarget }),
  target: textEntry('target', 'Target', { getTarget: parameterTarget }),
  targetExpression: textEntry('targetExpression', 'Target expression', { getTarget: parameterTarget }),
  targetType: textEntry('targetType', 'Target type', { getTarget: parameterTarget }),
  transient: checkboxEntry('transient', 'Transient', { getTarget: parameterTarget }),
  name: textEntry('name', 'Name', { getTarget: parameterTarget }),
  value: textEntry('value', 'Value', { getTarget: parameterTarget }),
  type: textEntry('type', 'Type', { getTarget: parameterTarget }),
  businessKey: textEntry('businessKey', 'Business key', { getTarget: parameterTarget }),
  local: checkboxEntry('local', 'Local', { getTarget: parameterTarget })
};


/**
 * A list group of mapping parameters stored as extension elements of one
 * type, such as <flowable:externalWorkerInParameter>.
 *
 * @param {Object} options
 * @param {djs.model.Base} options.element
 * @param {Injector} options.injector
 * @param {string} options.type - e.g. 'flowable:ExternalWorkerInParameter'
 * @param {string} options.id - group id
 * @param {string} options.label
 * @param {string[]|Function} options.attributes - attributes to edit, in order,
 *   or (parameter) => attributes
 * @param {Function} [options.getLabel] - (parameter) => item label
 * @param {Function} [options.leadingEntries] - (id, parameter) => entries
 *   shown before the attributes
 * @param {Object} [options.attrs] - attributes of a new parameter
 */
export function parameterGroup({
  element,
  injector,
  type,
  id: groupId,
  label,
  attributes,
  getLabel = mappingLabel,
  leadingEntries = () => [],
  attrs = {}
}) {
  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const businessObject = element.businessObject;
  const parameters = getExtensionElementsList(businessObject, type);

  return {
    id: groupId,
    label: translate(label),
    component: ListGroup,
    items: parameters.map((parameter, index) => {
      const id = `${ element.id }-${ groupId }-${ index }`;
      const itemAttributes = typeof attributes === 'function' ? attributes(parameter) : attributes;

      return {
        id,
        label: getLabel(parameter, translate),
        entries: [
          ...leadingEntries(id, parameter),
          ...itemAttributes.map(attribute => ({
            id: `${ id }-${ attribute }`,
            component: ATTRIBUTE_ENTRIES[attribute],
            parameter
          }))
        ],
        autoFocusEntry: `${ id }-${ itemAttributes[0] }`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, businessObject, [ parameter ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, businessObject, bpmnFactory.create(type, attrs), bpmnFactory));
    }
  };
}

/**
 * "source → target" of a mapping parameter.
 */
export function mappingLabel(parameter) {
  const source = parameter.get('source') || parameter.get('sourceExpression') || '?';
  const target = parameter.get('target') || parameter.get('targetExpression') || '?';

  return `${ source } → ${ target }`;
}
