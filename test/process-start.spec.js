import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getExtensionElement, getExtensionElementsList } from '../index.js';

import {
  addListItem,
  changeInput,
  createModeler,
  destroyModeler,
  openGroup,
  openItem,
  tick
} from './helper.js';

import xml from './fixtures/process-start.bpmn?raw';


describe('Flowable process, start and form property groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const process = () => panel.element('participant').businessObject.get('processRef');

  const formProperties = element => getExtensionElementsList(element.businessObject, 'flowable:FormProperty');


  describe('process', function() {

    it('shows the process attributes on the participant', async function() {

      // when
      await panel.select('participant');
      await openGroup(panel.group('flowable-process'));

      // then
      expect(panel.input('flowable-candidateStarterUsers').value).toBe('kermit');
      expect(panel.input('flowable-candidateStarterGroups').value).toBe('');
      expect(panel.input('flowable-potentialStarter').value).toBe('group(management)');
      expect(panel.input('flowable-historyLevel').value).toBe('audit');
      expect(panel.input('flowable-isEagerExecutionFetching').checked).toBe(true);
    });


    it('writes to the process of the participant', async function() {

      // given
      await panel.select('participant');
      await openGroup(panel.group('flowable-process'));

      // when
      await changeInput(panel.input('flowable-candidateStarterGroups'), 'management');
      await changeInput(panel.input('flowable-candidateStarterUsers'), '');
      await changeInput(panel.input('flowable-isEagerExecutionFetching'), false);

      // then
      expect(process().get('flowable:candidateStarterGroups')).toBe('management');
      expect(process().get('flowable:candidateStarterUsers')).toBeUndefined();
      expect(process().get('flowable:isEagerExecutionFetching')).toBeUndefined();
    });


    it('edits the potential starter expression and removes it when cleared', async function() {

      // given
      await panel.select('participant');
      await openGroup(panel.group('flowable-process'));

      // when
      await changeInput(panel.input('flowable-potentialStarter'), 'user(kermit), group(management)');

      // then
      const expression = getExtensionElement(process(), 'flowable:PotentialStarter')
        .get('resourceAssignmentExpression').get('expression');

      expect(expression.get('body')).toBe('user(kermit), group(management)');

      // when
      await changeInput(panel.input('flowable-potentialStarter'), '');

      // then
      expect(getExtensionElement(process(), 'flowable:PotentialStarter')).toBeUndefined();
    });


    it('creates a potential starter that Flowable reads', async function() {

      // given
      await panel.select('participant');
      await openGroup(panel.group('flowable-process'));
      await changeInput(panel.input('flowable-potentialStarter'), '');

      // when
      await changeInput(panel.input('flowable-potentialStarter'), 'user(gonzo)');

      // then
      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toMatch(/<flowable:potentialStarter>\s*<resourceAssignmentExpression>\s*<formalExpression>user\(gonzo\)<\/formalExpression>/);
    });


    it('sets and clears the history level', async function() {

      // given
      await panel.select('participant');
      await openGroup(panel.group('flowable-process'));

      // when
      await changeInput(panel.input('flowable-historyLevel'), 'full');

      // then
      expect(getExtensionElement(process(), 'flowable:HistoryLevel').get('body')).toBe('full');

      // when
      await changeInput(panel.input('flowable-historyLevel'), '');

      // then
      expect(getExtensionElement(process(), 'flowable:HistoryLevel')).toBeUndefined();
    });


    it('is not offered on flow nodes', async function() {

      // when
      await panel.select('task');

      // then
      expect(panel.group('flowable-process')).toBeNull();
    });

  });


  describe('start event', function() {

    it('shows initiator and form attributes', async function() {

      // when
      await panel.select('start');
      await openGroup(panel.group('flowable-start'));

      // then
      expect(panel.input('flowable-initiator').value).toBe('starter');
      expect(panel.input('flowable-formKey').value).toBe('request');
      expect(panel.input('flowable-sameDeployment').checked).toBe(false);
    });


    it('treats same deployment as true by default', async function() {

      // given
      const start = await panel.select('start');
      await openGroup(panel.group('flowable-start'));

      // when
      await changeInput(panel.input('flowable-sameDeployment'), true);

      // then
      expect(start.businessObject.get('flowable:sameDeployment')).toBeUndefined();
      expect(panel.input('flowable-sameDeployment').checked).toBe(true);

      // when
      await changeInput(panel.input('flowable-sameDeployment'), false);

      // then
      expect(start.businessObject.get('flowable:sameDeployment')).toBe(false);
    });


    it('is only offered on start events', async function() {

      // when
      await panel.select('task');

      // then
      expect(panel.group('flowable-start')).toBeNull();
    });

  });


  describe('form properties', function() {

    it('lists the form properties of the start event', async function() {

      // when
      await panel.select('start');

      // then
      const group = panel.group('flowable-formProperties');
      const title = id => group.querySelector(`[data-entry-id="${ id }"] .bio-properties-panel-collapsible-entry-header-title`).textContent;

      expect(title('start-flowable-formProperty-0')).toBe('Color');
      expect(title('start-flowable-formProperty-1')).toBe('due');
      expect(group.querySelector('[data-entry-id="start-flowable-formProperty-2"]')).toBeNull();
    });


    it('shows the enum values of an enum property', async function() {

      // given
      await panel.select('start');

      // when
      await openItem(panel.panel, 'start-flowable-formProperty-0');

      // then
      expect(panel.input('start-flowable-formProperty-0-type').value).toBe('enum');
      expect(panel.input('start-flowable-formProperty-0-required').checked).toBe(true);
      expect(panel.input('start-flowable-formProperty-0-readable').checked).toBe(true);
      expect(panel.entry('start-flowable-formProperty-0-values')).not.toBeNull();
      expect(panel.entry('start-flowable-formProperty-0-datePattern')).toBeNull();

      await openItem(panel.panel, 'start-flowable-formProperty-0-values-value-1');

      expect(panel.input('start-flowable-formProperty-0-values-value-1-id').value).toBe('blue');
    });


    it('shows the date pattern of a date property and writable false', async function() {

      // given
      await panel.select('start');

      // when
      await openItem(panel.panel, 'start-flowable-formProperty-1');

      // then
      expect(panel.input('start-flowable-formProperty-1-datePattern').value).toBe('dd-MM-yyyy');
      expect(panel.input('start-flowable-formProperty-1-writable').checked).toBe(false);
      expect(panel.entry('start-flowable-formProperty-1-values')).toBeNull();
    });


    it('adds an enum value', async function() {

      // given
      const start = await panel.select('start');
      await openItem(panel.panel, 'start-flowable-formProperty-0');

      // when
      panel.entry('start-flowable-formProperty-0-values').querySelector('.bio-properties-panel-add-entry').click();
      await tick();
      await openItem(panel.panel, 'start-flowable-formProperty-0-values-value-2');
      await changeInput(panel.input('start-flowable-formProperty-0-values-value-2-id'), 'green');
      await changeInput(panel.input('start-flowable-formProperty-0-values-value-2-name'), 'Green');

      // then
      const values = formProperties(start)[0].get('values');

      expect(values.map(v => v.get('id'))).toEqual([ 'red', 'blue', 'green' ]);

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:value id="green" name="Green" />');
    });


    it('drops the enum values when the type changes', async function() {

      // given
      const start = await panel.select('start');
      await openItem(panel.panel, 'start-flowable-formProperty-0');

      // when
      await changeInput(panel.input('start-flowable-formProperty-0-type'), 'string');

      // then
      const [ property ] = formProperties(start);

      expect(property.get('type')).toBe('string');
      expect(property.get('values')).toEqual([]);
    });


    it('keeps a custom form type', async function() {

      // given
      const start = await panel.select('start');
      const [ property ] = formProperties(start);

      panel.get('modeling').updateModdleProperties(start, property, { type: 'customUser', values: [] });
      await tick();

      // when
      await openItem(panel.panel, 'start-flowable-formProperty-0');

      // then
      expect(panel.input('start-flowable-formProperty-0-type').value).toBe('customUser');
    });


    it('adds a form property to a user task and undoes it', async function() {

      // given
      const task = await panel.select('task');

      // when
      await addListItem(panel.group('flowable-formProperties'));
      await openItem(panel.panel, 'task-flowable-formProperty-0');
      await changeInput(panel.input('task-flowable-formProperty-0-id'), 'approved');
      await changeInput(panel.input('task-flowable-formProperty-0-type'), 'boolean');
      await changeInput(panel.input('task-flowable-formProperty-0-readable'), false);

      // then
      const [ property ] = formProperties(task);

      expect(property.get('id')).toBe('approved');
      expect(property.get('type')).toBe('boolean');
      expect(property.get('readable')).toBe(false);

      // when
      const commandStack = panel.get('commandStack');

      while (commandStack.canUndo()) {
        commandStack.undo();
      }

      await tick();

      // then
      expect(task.businessObject.get('extensionElements')).toBeUndefined();
    });


    it('is not offered on other events', async function() {

      // when
      await panel.select('end');

      // then
      expect(panel.group('flowable-formProperties')).toBeNull();
    });

  });

});
