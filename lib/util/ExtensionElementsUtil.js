import { is } from 'bpmn-js/lib/util/ModelUtil';

/**
 * Extension elements of a business object, optionally of one type.
 *
 * @param {ModdleElement} businessObject
 * @param {string} [type] - e.g. 'flowable:JobCategory'
 *
 * @return {ModdleElement[]}
 */
export function getExtensionElementsList(businessObject, type) {
  const extensionElements = businessObject.get('extensionElements');
  const values = (extensionElements && extensionElements.get('values')) || [];

  return type ? values.filter(value => is(value, type)) : values;
}

/**
 * The first extension element of a type, if any.
 *
 * @param {ModdleElement} businessObject
 * @param {string} type
 *
 * @return {ModdleElement|undefined}
 */
export function getExtensionElement(businessObject, type) {
  return getExtensionElementsList(businessObject, type)[0];
}

/**
 * Commands that add an extension element, creating bpmn:ExtensionElements if
 * needed. Run them with the 'properties-panel.multi-command-executor'.
 *
 * @return {Object[]} commands
 */
export function addExtensionElementCommands(element, businessObject, extensionElement, bpmnFactory) {
  const commands = [];
  let extensionElements = businessObject.get('extensionElements');

  if (!extensionElements) {
    extensionElements = bpmnFactory.create('bpmn:ExtensionElements', { values: [] });
    extensionElements.$parent = businessObject;

    commands.push({
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: businessObject, properties: { extensionElements } }
    });
  }

  extensionElement.$parent = extensionElements;

  commands.push({
    cmd: 'element.updateModdleProperties',
    context: {
      element,
      moddleElement: extensionElements,
      properties: { values: [ ...extensionElements.get('values'), extensionElement ] }
    }
  });

  return commands;
}

/**
 * Commands that remove extension elements, and bpmn:ExtensionElements once it
 * is empty.
 *
 * @return {Object[]} commands
 */
export function removeExtensionElementsCommands(element, businessObject, extensionElementsToRemove) {
  const extensionElements = businessObject.get('extensionElements');

  if (!extensionElements) {
    return [];
  }

  const values = extensionElements.get('values').filter(value => !extensionElementsToRemove.includes(value));

  if (!values.length) {
    return [ {
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: businessObject, properties: { extensionElements: undefined } }
    } ];
  }

  return [ {
    cmd: 'element.updateModdleProperties',
    context: { element, moddleElement: extensionElements, properties: { values } }
  } ];
}

/**
 * Sets the text body of a single extension element of a type, such as
 * <flowable:jobCategory>: creates it when a value is set, updates it, and
 * removes it (and an empty bpmn:ExtensionElements) when the value is cleared.
 *
 * @param {Object} options
 * @param {djs.model.Base} options.element
 * @param {string} options.type - e.g. 'flowable:JobCategory'
 * @param {string} [options.value]
 * @param {BpmnFactory} options.bpmnFactory
 * @param {CommandStack} options.commandStack
 * @param {ModdleElement} [options.businessObject] - defaults to the element's
 */
export function setExtensionElementBody({ element, type, value, bpmnFactory, commandStack, businessObject }) {
  businessObject = businessObject || element.businessObject;

  const existing = getExtensionElement(businessObject, type);
  const empty = value === undefined || value === null || value === '';

  let commands;

  if (empty) {
    commands = existing ? removeExtensionElementsCommands(element, businessObject, [ existing ]) : [];
  } else if (existing) {
    commands = [ {
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: existing, properties: { body: value } }
    } ];
  } else {
    commands = addExtensionElementCommands(element, businessObject, bpmnFactory.create(type, { body: value }), bpmnFactory);
  }

  if (commands.length) {
    commandStack.execute('properties-panel.multi-command-executor', commands);
  }
}
