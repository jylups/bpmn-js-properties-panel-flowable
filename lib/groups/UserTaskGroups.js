import { jsx } from '@bpmn-io/properties-panel/preact/jsx-runtime';

import {
  Group,
  ListGroup,
  TextFieldEntry,
  isCheckboxEntryEdited,
  isTextFieldEntryEdited
} from '@bpmn-io/properties-panel';

import { useService } from 'bpmn-js-properties-panel';

import { is, isAny } from 'bpmn-js/lib/util/ModelUtil';

import { textEntry } from '../entries/AttributeEntries.js';

import { FormFieldValidation, FormKey, SameDeployment } from './ProcessStartGroups.js';

import {
  addExtensionElementCommands,
  getExtensionElementsList,
  removeExtensionElementsCommands
} from '../util/ExtensionElementsUtil.js';

import {
  createResourceAssignment,
  getFormalExpression,
  setFormalExpressionCommand
} from '../util/ResourceAssignmentUtil.js';


/**
 * Who works on a user task (inventory section 4).
 */
export function AssignmentGroup(element, injector) {
  if (!is(element, 'bpmn:UserTask')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-assignment',
    label: translate('Assignment'),
    component: Group,
    entries: [
      { id: 'flowable-assignee', component: Assignee, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-owner', component: Owner, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-candidateUsers', component: CandidateUsers, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-candidateGroups', component: CandidateGroups, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * Custom identity links (<flowable:customResource>) of a user task, such as a
 * business administrator: a link type and a formal expression of users and
 * groups.
 */
export function CustomResourcesGroup(element, injector) {
  if (!is(element, 'bpmn:UserTask')) {
    return null;
  }

  const translate = injector.get('translate');
  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  const businessObject = element.businessObject;
  const resources = getExtensionElementsList(businessObject, 'flowable:CustomResource');

  return {
    id: 'flowable-customResources',
    label: translate('Custom resources'),
    component: ListGroup,
    items: resources.map((resource, index) => {
      const id = `${ element.id }-flowable-customResource-${ index }`;

      return {
        id,
        label: resource.get('name') || translate('<empty>'),
        entries: [
          { id: `${ id }-name`, component: ResourceName, resource },
          { id: `${ id }-expression`, component: ResourceExpression, resource }
        ],
        autoFocusEntry: `${ id }-name`,
        remove: () => commandStack.execute('properties-panel.multi-command-executor',
          removeExtensionElementsCommands(element, businessObject, [ resource ]))
      };
    }),
    add: event => {
      event.stopPropagation();

      const resource = bpmnFactory.create('flowable:CustomResource', {
        name: '',
        resourceAssignmentExpression: createResourceAssignment(bpmnFactory, '')
      });

      resource.get('resourceAssignmentExpression').$parent = resource;

      commandStack.execute('properties-panel.multi-command-executor',
        addExtensionElementCommands(element, businessObject, resource, bpmnFactory));
    }
  };
}

/**
 * Due date, priority and the other task settings of a user task.
 */
export function UserTaskGroup(element, injector) {
  if (!is(element, 'bpmn:UserTask')) {
    return null;
  }

  const translate = injector.get('translate');

  return {
    id: 'flowable-userTask',
    label: translate('Task'),
    component: Group,
    entries: [
      { id: 'flowable-dueDate', component: DueDate, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-businessCalendarName', component: BusinessCalendarName, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-priority', component: Priority, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-category', component: Category, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-skipExpression', component: SkipExpression, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-taskIdVariableName', component: TaskIdVariableName, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-taskCompleterVariableName', component: TaskCompleterVariableName, isEdited: isTextFieldEntryEdited },
      { id: 'flowable-extensionId', component: ExtensionId, isEdited: isTextFieldEntryEdited }
    ]
  };
}

/**
 * The form of a user task, or of a form-aware service task. On service tasks
 * sameDeployment belongs to the case type, so it is not offered here.
 */
export function TaskFormGroup(element, injector) {
  if (!isAny(element, [ 'bpmn:UserTask', 'bpmn:ServiceTask' ])) {
    return null;
  }

  const translate = injector.get('translate');

  const entries = [
    { id: 'flowable-formKey', component: FormKey, isEdited: isTextFieldEntryEdited },
    { id: 'flowable-formFieldValidation', component: FormFieldValidation, isEdited: isTextFieldEntryEdited }
  ];

  if (is(element, 'bpmn:UserTask')) {
    entries.push({ id: 'flowable-sameDeployment', component: SameDeployment, isEdited: isCheckboxEntryEdited });
  }

  return {
    id: 'flowable-form',
    label: translate('Form'),
    component: Group,
    entries
  };
}


// assignment //////////

const Assignee = textEntry('flowable:assignee', 'Assignee', {
  description: 'User ID or expression, for example ${initiator}'
});

const Owner = textEntry('flowable:owner', 'Owner');

const CandidateUsers = textEntry('flowable:candidateUsers', 'Candidate users', {
  description: 'Comma-separated user IDs or expressions'
});

const CandidateGroups = textEntry('flowable:candidateGroups', 'Candidate groups', {
  description: 'Comma-separated group IDs or expressions'
});


// custom resources //////////

function ResourceName({ element, id, resource }) {
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Link type'),
    description: translate('For example businessAdministrator'),
    debounce,
    getValue: () => resource.get('name') || '',
    setValue: value => commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: resource,
      properties: { name: value || '' }
    })
  });
}

function ResourceExpression({ element, id, resource }) {
  const bpmnFactory = useService('bpmnFactory');
  const commandStack = useService('commandStack');
  const debounce = useService('debounceInput');
  const translate = useService('translate');

  return jsx(TextFieldEntry, {
    element,
    id,
    label: translate('Users and groups'),
    description: translate('For example user(kermit), group(management)'),
    debounce,
    getValue: () => getFormalExpression(resource)?.get('body') || '',
    setValue: value => commandStack.execute('properties-panel.multi-command-executor', [
      setFormalExpressionCommand(element, resource, value || '', bpmnFactory)
    ])
  });
}


// task //////////

const DueDate = textEntry('flowable:dueDate', 'Due date', {
  description: 'ISO 8601 date or duration (P2DT4H), or an expression'
});

const BusinessCalendarName = textEntry('flowable:businessCalendarName', 'Business calendar', {
  description: 'Calendar used to compute the due date'
});

const Priority = textEntry('flowable:priority', 'Priority', {
  description: 'A number or an expression'
});

const Category = textEntry('flowable:category', 'Category');

const SkipExpression = textEntry('flowable:skipExpression', 'Skip expression', {
  description: 'Skips the task when true; needs the _FLOWABLE_SKIP_EXPRESSION_ENABLED variable'
});

const TaskIdVariableName = textEntry('flowable:taskIdVariableName', 'Task ID variable', {
  description: 'Variable that receives the ID of the created task'
});

const TaskCompleterVariableName = textEntry('flowable:taskCompleterVariableName', 'Completer variable', {
  description: 'Variable that receives the ID of the user who completes the task'
});

const ExtensionId = textEntry('flowable:extensionId', 'Extension ID');
