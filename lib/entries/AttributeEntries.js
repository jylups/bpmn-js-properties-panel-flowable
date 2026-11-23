import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CheckboxEntry,
  SelectEntry,
  TextAreaEntry,
  TextFieldEntry
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';


/**
 * Entry components bound to one attribute of a moddle element.
 *
 * Each factory returns a component for an entry definition. By default it edits
 * the selected element's business object; pass `getTarget(element, props)` to
 * edit another moddle element, such as the process of a participant or a
 * form property. Changes run as 'element.updateModdleProperties', so they are
 * undoable and work for any moddle element.
 */

function useUpdate(element, target) {
  const commandStack = useService('commandStack');

  return properties => commandStack.execute('element.updateModdleProperties', {
    element,
    moddleElement: target,
    properties
  });
}

const defaultTarget = element => element.businessObject;

/**
 * A text field. An empty value removes the attribute.
 */
export function textEntry(property, label, options = {}) {
  const { getTarget = defaultTarget, description, validate, area = false } = options;

  return function TextEntry(props) {
    const { element, id } = props;
    const debounce = useService('debounceInput');
    const translate = useService('translate');
    const target = getTarget(element, props);
    const update = useUpdate(element, target);

    return jsx(area ? TextAreaEntry : TextFieldEntry, {
      element,
      id,
      label: translate(label),
      description: description && translate(description),
      debounce,
      rows: area ? 2 : undefined,
      autoResize: area || undefined,
      validate: validate && (value => validate(value, translate)),
      getValue: () => target.get(property) ?? '',
      setValue: value => update({ [property]: value === '' ? undefined : value })
    });
  };
}

/**
 * A checkbox for a boolean attribute.
 *
 * With `defaultValue: true` (Flowable's default for attributes such as
 * sameDeployment or readable) an absent attribute shows as checked, and only
 * false is written; checking it again removes the attribute.
 */
export function checkboxEntry(property, label, options = {}) {
  const { getTarget = defaultTarget, tooltip, defaultValue = false } = options;

  return function CheckboxAttributeEntry(props) {
    const { element, id } = props;
    const translate = useService('translate');
    const target = getTarget(element, props);
    const update = useUpdate(element, target);

    return jsx(CheckboxEntry, {
      element,
      id,
      label: translate(label),
      tooltip: tooltip && translate(tooltip),
      getValue: () => {
        const value = target.get(property);

        return value === undefined ? defaultValue : !!value;
      },
      setValue: value => update({ [property]: value === defaultValue ? undefined : value })
    });
  };
}

/**
 * A select. The option with the value '' removes the attribute.
 *
 * @param {Array<{ value: string, label: string }>} choices
 */
export function selectEntry(property, label, choices, options = {}) {
  const { getTarget = defaultTarget, tooltip } = options;

  return function SelectAttributeEntry(props) {
    const { element, id } = props;
    const translate = useService('translate');
    const target = getTarget(element, props);
    const update = useUpdate(element, target);

    return jsx(SelectEntry, {
      element,
      id,
      label: translate(label),
      tooltip: tooltip && translate(tooltip),
      getOptions: () => choices.map(choice => ({ value: choice.value, label: translate(choice.label) })),
      getValue: () => target.get(property) ?? '',
      setValue: value => update({ [property]: value === '' ? undefined : value })
    });
  };
}
