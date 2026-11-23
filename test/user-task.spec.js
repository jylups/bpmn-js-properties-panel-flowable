import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getExtensionElementsList } from '../index.js';

import {
  addListItem,
  changeInput,
  createModeler,
  destroyModeler,
  openGroup,
  openItem,
  tick
} from './helper.js';

import xml from './fixtures/user-task.bpmn?raw';


describe('Flowable user task groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const resources = element => getExtensionElementsList(element.businessObject, 'flowable:CustomResource');

  const undoAll = async () => {
    const commandStack = panel.get('commandStack');

    while (commandStack.canUndo()) {
      commandStack.undo();
    }

    await tick();
  };


  it('orders the user task groups', async function() {

    // when
    await panel.select('review');

    // then
    const groupIds = [ ...panel.panel.querySelectorAll('[data-group-id^="group-flowable-"]') ].map(node => node.dataset.groupId);

    expect(groupIds).toEqual([
      'group-flowable-general',
      'group-flowable-assignment',
      'group-flowable-customResources',
      'group-flowable-userTask',
      'group-flowable-form',
      'group-flowable-formProperties',
      'group-flowable-async',
      'group-flowable-executionListeners',
      'group-flowable-taskListeners'
    ]);
  });


  it('offers none of them on other tasks', async function() {

    // when
    await panel.select('start');

    // then
    for (const id of [ 'assignment', 'customResources', 'userTask', 'form' ]) {
      expect(panel.group(`flowable-${ id }`)).toBeNull();
    }
  });


  describe('assignment', function() {

    it('shows the assignment attributes', async function() {

      // when
      await panel.select('review');
      await openGroup(panel.group('flowable-assignment'));

      // then
      expect(panel.input('flowable-assignee').value).toBe('${initiator}');
      expect(panel.input('flowable-owner').value).toBe('');
      expect(panel.input('flowable-candidateUsers').value).toBe('');
      expect(panel.input('flowable-candidateGroups').value).toBe('management, auditors');
    });


    it('edits, clears and undoes', async function() {

      // given
      const task = await panel.select('review');
      await openGroup(panel.group('flowable-assignment'));

      // when
      await changeInput(panel.input('flowable-owner'), 'gonzo');
      await changeInput(panel.input('flowable-candidateUsers'), 'kermit, fozzie');
      await changeInput(panel.input('flowable-assignee'), '');

      // then
      const bo = task.businessObject;

      expect(bo.get('flowable:owner')).toBe('gonzo');
      expect(bo.get('flowable:candidateUsers')).toBe('kermit, fozzie');
      expect(bo.get('flowable:assignee')).toBeUndefined();

      // when
      await undoAll();

      // then
      expect(bo.get('flowable:owner')).toBeUndefined();
      expect(bo.get('flowable:assignee')).toBe('${initiator}');
    });

  });


  describe('custom resources', function() {

    it('shows a custom resource', async function() {

      // given
      await panel.select('review');

      // when
      await openItem(panel.panel, 'review-flowable-customResource-0');

      // then
      expect(panel.input('review-flowable-customResource-0-name').value).toBe('businessAdministrator');
      expect(panel.input('review-flowable-customResource-0-expression').value).toBe('user(admin), group(auditors)');
    });


    it('adds a custom resource that Flowable reads', async function() {

      // given
      const task = await panel.select('review');

      // when
      await addListItem(panel.group('flowable-customResources'));
      await openItem(panel.panel, 'review-flowable-customResource-1');
      await changeInput(panel.input('review-flowable-customResource-1-name'), 'watcher');
      await changeInput(panel.input('review-flowable-customResource-1-expression'), 'group(observers)');

      // then
      expect(resources(task)[1].get('name')).toBe('watcher');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toMatch(/<flowable:customResource name="watcher">\s*<resourceAssignmentExpression>\s*<formalExpression>group\(observers\)<\/formalExpression>/);

      // when
      await undoAll();

      // then
      expect(resources(task)).toHaveLength(1);
    });


    it('edits the expression of a resource without one', async function() {

      // given
      const task = await panel.select('review');
      const [ resource ] = resources(task);

      panel.get('modeling').updateModdleProperties(task, resource, { resourceAssignmentExpression: undefined });
      await tick();

      await openItem(panel.panel, 'review-flowable-customResource-0');

      // when
      await changeInput(panel.input('review-flowable-customResource-0-expression'), 'user(kermit)');

      // then
      expect(resource.get('resourceAssignmentExpression').get('expression').get('body')).toBe('user(kermit)');
    });


    it('removes a custom resource and the empty bpmn:ExtensionElements', async function() {

      // given
      const task = await panel.select('review');

      // when
      panel.group('flowable-customResources').querySelector('.bio-properties-panel-remove-entry').click();
      await tick();

      // then
      expect(task.businessObject.get('extensionElements')).toBeUndefined();
    });

  });


  describe('task', function() {

    it('shows the task attributes', async function() {

      // when
      await panel.select('review');
      await openGroup(panel.group('flowable-userTask'));

      // then
      expect(panel.input('flowable-dueDate').value).toBe('P2DT4H');
      expect(panel.input('flowable-priority').value).toBe('80');
      expect(panel.input('flowable-category').value).toBe('finance');
      expect(panel.input('flowable-taskCompleterVariableName').value).toBe('reviewer');
      expect(panel.input('flowable-skipExpression').value).toBe('');
    });


    it('edits and undoes', async function() {

      // given
      const task = await panel.select('review');
      await openGroup(panel.group('flowable-userTask'));

      // when
      await changeInput(panel.input('flowable-businessCalendarName'), 'workdays');
      await changeInput(panel.input('flowable-skipExpression'), '${skip}');
      await changeInput(panel.input('flowable-taskIdVariableName'), 'reviewTaskId');
      await changeInput(panel.input('flowable-extensionId'), 'ext-1');
      await changeInput(panel.input('flowable-priority'), '${priority}');

      // then
      const bo = task.businessObject;

      expect(bo.get('flowable:businessCalendarName')).toBe('workdays');
      expect(bo.get('flowable:skipExpression')).toBe('${skip}');
      expect(bo.get('flowable:taskIdVariableName')).toBe('reviewTaskId');
      expect(bo.get('flowable:extensionId')).toBe('ext-1');
      expect(bo.get('flowable:priority')).toBe('${priority}');

      // when
      await undoAll();

      // then
      expect(bo.get('flowable:businessCalendarName')).toBeUndefined();
      expect(bo.get('flowable:priority')).toBe('80');
    });

  });


  describe('form', function() {

    it('shows and edits the task form', async function() {

      // given
      const task = await panel.select('review');
      await openGroup(panel.group('flowable-form'));

      // then
      expect(panel.input('flowable-formKey').value).toBe('review');
      expect(panel.input('flowable-sameDeployment').checked).toBe(false);

      // when
      await changeInput(panel.input('flowable-formFieldValidation'), 'false');
      await changeInput(panel.input('flowable-sameDeployment'), true);

      // then
      expect(task.businessObject.get('flowable:formFieldValidation')).toBe('false');
      expect(task.businessObject.get('flowable:sameDeployment')).toBeUndefined();
    });

  });

});
