import { AsyncGroup } from './groups/AsyncGroup.js';
import { CallActivityGroup, InMappingsGroup, OutMappingsGroup } from './groups/CallActivityGroups.js';
import { DataObjectGroup, LocalizationGroup, SequenceFlowGroup } from './groups/DataFlowGroups.js';
import { EventCorrelationGroup, EventDefinitionGroup, EventOutParametersGroup, EventRegistryGroup, VariableListenerGroup } from './groups/EventGroups.js';
import { FormPropertiesGroup } from './groups/FormPropertiesGroup.js';
import { GeneralGroup } from './groups/GeneralGroup.js';
import { EventListenersGroup, ExecutionListenersGroup, TaskListenersGroup } from './groups/ListenerGroups.js';
import { MultiInstanceGroup, VariableAggregationsGroup } from './groups/MultiInstanceGroups.js';
import { ProcessGroup, StartEventGroup } from './groups/ProcessStartGroups.js';
import {
  CaseGroup,
  EventInGroup,
  EventOutGroup,
  ExternalWorkerGroup,
  ExternalWorkerInGroup,
  ExternalWorkerOutGroup,
  FieldInjectionGroup,
  HttpHandlersGroup,
  ImplementationGroup,
  MapExceptionsGroup,
  SendEventGroup,
  SendTaskImplementationGroup,
  TriggerCorrelationGroup,
  TypeFieldsGroup
} from './groups/ServiceTaskGroups.js';
import {
  BusinessRuleTaskGroup,
  ReceiveTaskGroup,
  ScriptTaskGroup
} from './groups/TaskGroups.js';
import { AssignmentGroup, CustomResourcesGroup, TaskFormGroup, UserTaskGroup } from './groups/UserTaskGroups.js';

/**
 * Lower than the default (1000) of the bpmn.io provider, so the Flowable groups
 * are added after the BPMN ones.
 */
const LOW_PRIORITY = 500;

/**
 * Group factories in display order. Each takes (element, injector) and returns
 * a group, or null when it does not apply to the element.
 */
export const GROUPS = [
  GeneralGroup,
  DataObjectGroup,
  SequenceFlowGroup,
  ProcessGroup,
  StartEventGroup,
  AssignmentGroup,
  CustomResourcesGroup,
  UserTaskGroup,
  ImplementationGroup,
  SendTaskImplementationGroup,
  ScriptTaskGroup,
  BusinessRuleTaskGroup,
  ReceiveTaskGroup,
  EventDefinitionGroup,
  VariableListenerGroup,
  EventRegistryGroup,
  EventOutParametersGroup,
  EventCorrelationGroup,
  TypeFieldsGroup,
  HttpHandlersGroup,
  CaseGroup,
  CallActivityGroup,
  InMappingsGroup,
  OutMappingsGroup,
  ExternalWorkerGroup,
  ExternalWorkerInGroup,
  ExternalWorkerOutGroup,
  SendEventGroup,
  EventInGroup,
  EventOutGroup,
  TriggerCorrelationGroup,
  FieldInjectionGroup,
  MapExceptionsGroup,
  TaskFormGroup,
  FormPropertiesGroup,
  MultiInstanceGroup,
  VariableAggregationsGroup,
  AsyncGroup,
  ExecutionListenersGroup,
  TaskListenersGroup,
  EventListenersGroup,
  LocalizationGroup
];


/**
 * Adds the Flowable groups to the bpmn.io properties panel.
 *
 * Needs the Flowable moddle descriptor (@jylups/flowable-bpmn-moddle)
 * registered as moddle extension `flowable`.
 */
export default class FlowablePropertiesProvider {

  constructor(propertiesPanel, injector) {
    this._injector = injector;

    propertiesPanel.registerProvider(LOW_PRIORITY, this);
  }

  getGroups(element) {
    return groups => {
      const flowableGroups = GROUPS
        .map(createGroup => createGroup(element, this._injector))
        .filter(group => group && (group.items || group.entries.length));

      return [ ...groups, ...flowableGroups ];
    };
  }
}

FlowablePropertiesProvider.$inject = [ 'propertiesPanel', 'injector' ];
