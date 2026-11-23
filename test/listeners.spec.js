import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getExtensionElementsList } from '../index.js';

import {
  addListItem,
  changeInput,
  createModeler,
  destroyModeler,
  openItem,
  tick
} from './helper.js';

import xml from './fixtures/listeners.bpmn?raw';


describe('Flowable listener groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const listeners = (element, type) => getExtensionElementsList(element.businessObject, type);


  describe('execution listeners', function() {

    it('lists the process listeners with event and type', async function() {

      // when
      await panel.select(null);

      // then
      const group = panel.group('flowable-executionListeners');
      const labels = [ ...group.querySelectorAll('.bio-properties-panel-collapsible-entry-header-title') ].map(n => n.textContent);

      expect(labels[0]).toBe('start: Java class');
    });


    it('shows the class, transaction phase and fields of a listener', async function() {

      // given
      await panel.select(null);

      // when
      await openItem(panel.panel, 'process-flowable-executionListeners-0');

      // then
      expect(panel.input('process-flowable-executionListeners-0-value').value).toBe('org.example.StartListener');
      expect(panel.input('process-flowable-executionListeners-0-onTransaction').value).toBe('committed');
      expect(panel.entry('process-flowable-executionListeners-0-fields')).not.toBeNull();
    });


    it('adds a listener to a task, creating bpmn:ExtensionElements, and undoes it', async function() {

      // given
      const start = await panel.select('start');

      // when
      await addListItem(panel.group('flowable-executionListeners'));

      // then
      const [ listener ] = listeners(start, 'flowable:ExecutionListener');

      expect(listener.get('event')).toBe('start');
      expect(listener.get('class')).toBe('');

      // when
      panel.get('commandStack').undo();
      await tick();

      // then
      expect(start.businessObject.get('extensionElements')).toBeUndefined();
    });


    it('offers only the take event on sequence flows', async function() {

      // given
      const flow = await panel.select('flow1');
      await addListItem(panel.group('flowable-executionListeners'));
      await openItem(panel.panel, 'flow1-flowable-executionListeners-0');

      // then
      const options = [ ...panel.input('flow1-flowable-executionListeners-0-event').options ].map(o => o.value);

      expect(options).toEqual([ 'take' ]);
      expect(listeners(flow, 'flowable:ExecutionListener')[0].get('event')).toBe('take');
    });


    it('switches the implementation to a script', async function() {

      // given
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-executionListeners-0');

      // when
      await changeInput(panel.input('process-flowable-executionListeners-0-implementation'), 'script');
      await changeInput(panel.input('process-flowable-executionListeners-0-script'), 'println "started"');

      // then
      const [ listener ] = listeners(panel.element('process'), 'flowable:ExecutionListener');

      expect(listener.get('type')).toBe('script');
      expect(listener.get('class')).toBeUndefined();
      expect(listener.get('fields')).toEqual([]);
      expect(listener.get('script').get('language')).toBe('groovy');
      expect(listener.get('script').get('body')).toBe('println "started"');
    });


    it('sets a custom properties resolver', async function() {

      // given
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-executionListeners-0');

      // when
      await changeInput(panel.input('process-flowable-executionListeners-0-resolverType'), 'customPropertiesResolverExpression');
      await changeInput(panel.input('process-flowable-executionListeners-0-resolverValue'), '${resolver}');

      // then
      const [ listener ] = listeners(panel.element('process'), 'flowable:ExecutionListener');

      expect(listener.get('customPropertiesResolverExpression')).toBe('${resolver}');
    });


    it('removes a listener and the empty bpmn:ExtensionElements', async function() {

      // given
      const task = await panel.select('task');
      const group = panel.group('flowable-taskListeners');

      // when
      group.querySelector('.bio-properties-panel-remove-entry').click();
      await tick();

      // then
      expect(task.businessObject.get('extensionElements')).toBeUndefined();
    });

  });


  describe('task listeners', function() {

    it('shows the task listener with all task events', async function() {

      // given
      await panel.select('task');

      // when
      await openItem(panel.panel, 'task-flowable-taskListeners-0');

      // then
      const options = [ ...panel.input('task-flowable-taskListeners-0-event').options ].map(o => o.value);

      expect(options).toEqual([ 'create', 'assignment', 'complete', 'delete', 'all' ]);
      expect(panel.input('task-flowable-taskListeners-0-implementation').value).toBe('delegateExpression');
      expect(panel.input('task-flowable-taskListeners-0-value').value).toBe('${notify}');
    });


    it('is not offered on other tasks or events', async function() {

      // when
      await panel.select('start');

      // then
      expect(panel.group('flowable-taskListeners')).toBeNull();
    });

  });


  describe('fields', function() {

    it('shows string and expression fields in their stored forms', async function() {

      // given
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-executionListeners-0');
      await openItem(panel.panel, 'process-flowable-executionListeners-0-fields-field-0');
      await openItem(panel.panel, 'process-flowable-executionListeners-0-fields-field-1');

      // then
      expect(panel.input('process-flowable-executionListeners-0-fields-field-0-type').value).toBe('string');
      expect(panel.input('process-flowable-executionListeners-0-fields-field-0-value').value).toBe('audit');
      expect(panel.input('process-flowable-executionListeners-0-fields-field-1-type').value).toBe('expression');
      expect(panel.input('process-flowable-executionListeners-0-fields-field-1-value').value).toBe('${channel}');
    });


    it('keeps the stringValue attribute when editing it', async function() {

      // given
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-executionListeners-0');
      await openItem(panel.panel, 'process-flowable-executionListeners-0-fields-field-0');

      // when
      await changeInput(panel.input('process-flowable-executionListeners-0-fields-field-0-value'), 'audit-v2');

      // then
      const field = listeners(panel.element('process'), 'flowable:ExecutionListener')[0].get('fields')[0];

      expect(field.get('stringValue')).toBe('audit-v2');
      expect(field.get('string')).toBeUndefined();
    });


    it('adds a field and writes an expression as a child, as Flowable does', async function() {

      // given
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-executionListeners-0');

      const fieldsEntry = panel.entry('process-flowable-executionListeners-0-fields');

      // when
      fieldsEntry.querySelector('.bio-properties-panel-add-entry').click();
      await tick();
      await openItem(panel.panel, 'process-flowable-executionListeners-0-fields-field-2');
      await changeInput(panel.input('process-flowable-executionListeners-0-fields-field-2-name'), 'recipient');
      await changeInput(panel.input('process-flowable-executionListeners-0-fields-field-2-type'), 'expression');
      await changeInput(panel.input('process-flowable-executionListeners-0-fields-field-2-value'), '${user.email}');

      // then
      const field = listeners(panel.element('process'), 'flowable:ExecutionListener')[0].get('fields')[2];

      expect(field.get('name')).toBe('recipient');
      expect(field.get('expression')).toBeUndefined();
      expect(field.get('expressionElement').get('body')).toBe('${user.email}');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:field name="recipient"><flowable:expression>${user.email}</flowable:expression></flowable:field>');
    });

  });


  describe('event listeners', function() {

    it('shows the process event listener', async function() {

      // given
      await panel.select(null);

      // when
      await openItem(panel.panel, 'process-flowable-eventListener-0');

      // then
      expect(panel.input('process-flowable-eventListener-0-events').value).toBe('TASK_CREATED');
      expect(panel.input('process-flowable-eventListener-0-entityType').value).toBe('task');
      expect(panel.input('process-flowable-eventListener-0-value').value).toBe('org.example.TaskEvents');
    });


    it('switches to throwing a signal', async function() {

      // given
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-eventListener-0');

      // when
      await changeInput(panel.input('process-flowable-eventListener-0-implementation'), 'throw-signal');
      await changeInput(panel.input('process-flowable-eventListener-0-throwValue'), 'taskCreated');

      // then
      const [ listener ] = listeners(panel.element('process'), 'flowable:EventListener');

      expect(listener.get('class')).toBeUndefined();
      expect(listener.get('throwEvent')).toBe('signal');
      expect(listener.get('signalName')).toBe('taskCreated');
    });


    it('is only offered on the process', async function() {

      // when
      await panel.select('task');

      // then
      expect(panel.group('flowable-eventListeners')).toBeNull();
    });

  });

});
