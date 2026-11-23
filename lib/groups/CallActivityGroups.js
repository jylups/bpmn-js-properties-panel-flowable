import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  CheckboxEntry,
  Group,
  SelectEntry,
  isCheckboxEntryEdited,
  isSelectEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { checkboxEntry, selectEntry, textEntry } from '../entries/AttributeEntries.js';

import { mappingLabel, parameterGroup } from './IOParameterGroups.js';

import { getServiceTaskImplementation } from './ServiceTaskGroups.js';


/**
 * The call activity: what it calls and how the child instance starts
 * (inventory section 7).
 */
export function CallActivityGroup(element, injector) {
  if (!is(element, 'bpmn:CallActivity')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-callActivity',
    label: translate('Called process'),
    component: Group,
    entries: [
      { id: 'flowable-calledElement', component: CalledElement, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-calledElementType', component: CalledElementType, isEdited: isSelectEntryEdited },
      { id: 'flowable-sameDeployment', component: SameDeploymentEntry, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-fallbackToDefaultTenant', component: FallbackToDefaultTenant, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-processInstanceName', component: ProcessInstanceName, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-businessKey', component: BusinessKey, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-inheritBusinessKey', component: InheritBusinessKey, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-inheritVariables', component: InheritVariables, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-useLocalScopeForOutParameters', component: UseLocalScopeForOut, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-completeAsync', component: CompleteAsync, isEdited: isCheckboxEntryEdited },
      { id: 'flowable-idVariableName', component: IdVariableName, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * Input mappings (<flowable:in>): into a called process or case, a script,
 * from the start of a process, or into catching events.
 */
export function InMappingsGroup(element, injector) {
  if (!(isAny(element, IN_ELEMENTS) || isCaseTask(element))) {
    return null;
  }

  return mappingsGroup(element, injector, 'flowable:In', 'flowable-in', 'In mappings');
}

/**
 * Output mappings (<flowable:out>) from a called process or case, or out of
 * end and intermediate throw events.
 */
export function OutMappingsGroup(element, injector) {
  if (!(isAny(element, OUT_ELEMENTS) || isCaseTask(element))) {
    return null;
  }

  return mappingsGroup(element, injector, 'flowable:Out', 'flowable-out', 'Out mappings');
}


// mappings //////////

const IN_ELEMENTS = [ 'bpmn:CallActivity', 'bpmn:StartEvent', 'bpmn:ScriptTask', 'bpmn:BoundaryEvent', 'bpmn:IntermediateCatchEvent' ];

const OUT_ELEMENTS = [ 'bpmn:CallActivity', 'bpmn:EndEvent', 'bpmn:IntermediateThrowEvent' ];

const VARIABLE_ATTRIBUTES = [ 'source', 'sourceExpression', 'sourceType', 'target', 'targetExpression', 'targetType', 'transient' ];

/**
 * What a mapping passes: one variable, all variables (variables="all") or,
 * for an in mapping, the business key.
 */
function getMappingKind(mapping) {
  if (mapping.get('variables') === 'all') {
    return 'all';
  }

  if (mapping.get('businessKey') !== undefined) {
    return 'businessKey';
  }

  return 'variable';
}

function mappingsGroup(element, injector, type, id, label) {
  return parameterGroup({
    element,
    injector,
    type,
    id,
    label,
    attrs: { source: '' },
    leadingEntries: (itemId, parameter) => [
      { id: `${ itemId }-kind`, component: MappingKindEntry, parameter }
    ],
    attributes: parameter => ({
      all: [ 'local' ],
      businessKey: [ 'businessKey' ],
      variable: VARIABLE_ATTRIBUTES
    })[getMappingKind(parameter)],
    getLabel: (parameter, translate) => ({
      all: translate('All variables'),
      businessKey: translate('Business key'),
      variable: mappingLabel(parameter)
    })[getMappingKind(parameter)]
  });
}

function MappingKindEntry({ element, id, parameter }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');

  return jsx(SelectEntry, {
    element,
    id,
    label: translate('Maps'),
    getOptions: () => [
      { value: 'variable', label: translate('A variable') },
      { value: 'all', label: translate('All variables') },
      ...(is(parameter, 'flowable:In') ? [ { value: 'businessKey', label: translate('The business key') } ] : [])
    ],
    getValue: () => getMappingKind(parameter),
    setValue: kind => {
      const properties = Object.fromEntries([ ...VARIABLE_ATTRIBUTES, 'variables', 'local', 'businessKey' ]
        .filter(name => parameter.$descriptor.propertiesByName[name])
        .map(name => [ name, undefined ]));

      if (kind === 'all') {
        properties.variables = 'all';
      } else if (kind === 'businessKey') {
        properties.businessKey = '';
      } else {
        properties.source = '';
      }

      commandStack.execute('element.updateModdleProperties', {
        element,
        moddleElement: parameter,
        properties
      });
    }
  });
}

function isCaseTask(element) {
  return is(element, 'bpmn:ServiceTask') && getServiceTaskImplementation(element.businessObject) === 'case';
}


// call activity //////////

const CalledElement = textEntry('calledElement', 'Called element', {
  description: 'Process definition key or ID, or an expression'
});

const CalledElementType = selectEntry('flowable:calledElementType', 'Called element type', [
  { value: '', label: 'Key (default)' },
  { value: 'key', label: 'Key' },
  { value: 'id', label: 'ID' }
]);

/**
 * Same deployment. Older models use calledElementBinding="deployment" instead;
 * an edit writes sameDeployment and drops the old attribute.
 */
function SameDeploymentEntry({ element, id }) {
  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const businessObject = element.businessObject;

  return jsx(CheckboxEntry, {
    element,
    id,
    label: translate('Process from the same deployment'),
    getValue: () => businessObject.get('flowable:sameDeployment') ?? businessObject.get('flowable:calledElementBinding') === 'deployment',
    setValue: checked => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: businessObject,
      properties: { 'flowable:sameDeployment': checked || undefined, 'flowable:calledElementBinding': undefined }
    })
  });
}

const FallbackToDefaultTenant = checkboxEntry('flowable:fallbackToDefaultTenant', 'Fall back to the default tenant');

const ProcessInstanceName = textEntry('flowable:processInstanceName', 'Process instance name');

const BusinessKey = textEntry('flowable:businessKey', 'Business key');

const InheritBusinessKey = checkboxEntry('flowable:inheritBusinessKey', 'Inherit business key');

const InheritVariables = checkboxEntry('flowable:inheritVariables', 'Inherit variables', {
  tooltip: 'Pass all variables of this process to the child.'
});

const UseLocalScopeForOut = checkboxEntry('flowable:useLocalScopeForOutParameters', 'Out mappings in local scope');

const CompleteAsync = checkboxEntry('flowable:completeAsync', 'Complete asynchronously', {
  tooltip: 'Continue this process in a new transaction when the child ends.'
});

const IdVariableName = textEntry('flowable:idVariableName', 'Process instance ID variable');
