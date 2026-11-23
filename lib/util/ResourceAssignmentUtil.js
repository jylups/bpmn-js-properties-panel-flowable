/**
 * Resource assignments as Flowable writes them, for potential starters and
 * custom resources:
 *
 *   <resourceAssignmentExpression>
 *     <formalExpression>user(kermit), group(management)</formalExpression>
 *   </resourceAssignmentExpression>
 */

/**
 * The formal expression of an element that holds a
 * bpmn:ResourceAssignmentExpression, such as flowable:PotentialStarter or
 * flowable:CustomResource.
 *
 * @param {ModdleElement} [holder]
 *
 * @return {ModdleElement|undefined}
 */
export function getFormalExpression(holder) {
  const assignment = holder && holder.get('resourceAssignmentExpression');

  return (assignment && assignment.get('expression')) || undefined;
}

/**
 * A new bpmn:ResourceAssignmentExpression holding a formal expression.
 *
 * @param {BpmnFactory} bpmnFactory
 * @param {string} body
 *
 * @return {ModdleElement}
 */
export function createResourceAssignment(bpmnFactory, body) {
  const expression = bpmnFactory.create('bpmn:FormalExpression', { body });
  const assignment = bpmnFactory.create('bpmn:ResourceAssignmentExpression', { expression });

  expression.$parent = assignment;

  return assignment;
}

/**
 * The command that sets the formal expression of a holder: updates the
 * existing expression, or adds a resource assignment.
 *
 * @return {Object} command for the 'properties-panel.multi-command-executor'
 */
export function setFormalExpressionCommand(element, holder, body, bpmnFactory) {
  const expression = getFormalExpression(holder);

  if (expression) {
    return {
      cmd: 'element.updateModdleProperties',
      context: { element, moddleElement: expression, properties: { body } }
    };
  }

  const assignment = createResourceAssignment(bpmnFactory, body);

  assignment.$parent = holder;

  return {
    cmd: 'element.updateModdleProperties',
    context: { element, moddleElement: holder, properties: { resourceAssignmentExpression: assignment } }
  };
}
