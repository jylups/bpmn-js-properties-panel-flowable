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

import xml from './fixtures/tasks.bpmn?raw';


describe('Flowable script, business rule, send and receive task groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const groupIds = () => [ ...panel.panel.querySelectorAll('[data-group-id^="group-flowable-"]') ].map(node => node.dataset.groupId.replace('group-flowable-', ''));

  const undoAll = async () => {
    const commandStack = panel.get('commandStack');

    while (commandStack.canUndo()) {
      commandStack.undo();
    }

    await tick();
  };

  const selectAndOpen = async (id, group) => {
    const element = await panel.select(id);
    await openGroup(panel.group(group));

    return element;
  };


  describe('script task', function() {

    it('shows the result variable alias and options', async function() {

      // when
      await selectAndOpen('script', 'flowable-scriptTask');

      // then
      expect(panel.input('flowable-scriptResultVariable').value).toBe('sum');
      expect(panel.input('flowable-autoStoreVariables').checked).toBe(false);
      expect(panel.input('flowable-doNotIncludeVariables').checked).toBe(false);
    });


    it('writes resultVariable, edits options and undoes', async function() {

      // given
      const task = await selectAndOpen('script', 'flowable-scriptTask');
      const bo = task.businessObject;

      // when
      await changeInput(panel.input('flowable-scriptResultVariable'), 'total');
      await changeInput(panel.input('flowable-doNotIncludeVariables'), true);
      await changeInput(panel.input('flowable-skipExpression'), '${skip}');

      // then
      expect(bo.get('flowable:resultVariable')).toBe('total');
      expect(bo.get('flowable:resultVariableName')).toBeUndefined();
      expect(bo.get('flowable:doNotIncludeVariables')).toBe(true);
      expect(bo.get('flowable:skipExpression')).toBe('${skip}');

      // when
      await undoAll();

      // then
      expect(bo.get('flowable:resultVariableName')).toBe('sum');
      expect(bo.get('flowable:resultVariable')).toBeUndefined();
      expect(bo.get('flowable:skipExpression')).toBeUndefined();
    });

  });


  describe('business rule task', function() {

    it('shows and edits the rule settings', async function() {

      // given
      const task = await selectAndOpen('rule', 'flowable-businessRule');

      // then
      expect(panel.input('flowable-ruleVariablesInput').value).toBe('order');
      expect(panel.input('flowable-rules').value).toBe('discount');
      expect(panel.input('flowable-ruleResultVariable').value).toBe('rulesOutput');

      // when
      await changeInput(panel.input('flowable-exclude'), true);
      await changeInput(panel.input('flowable-ruleClass'), 'org.example.Rules');
      await changeInput(panel.input('flowable-rules'), '');

      // then
      const bo = task.businessObject;

      expect(bo.get('flowable:exclude')).toBe(true);
      expect(bo.get('flowable:class')).toBe('org.example.Rules');
      expect(bo.get('flowable:rules')).toBeUndefined();
    });

  });


  describe('send task', function() {

    it('offers the send task types and shows the mail fields', async function() {

      // when
      await selectAndOpen('send', 'flowable-implementation');

      // then
      const options = [ ...panel.input('flowable-implementationType').options ].map(o => o.value);

      expect(options).toEqual([ '', 'mail', 'camel', 'dmn' ]);
      expect(panel.input('flowable-implementationType').value).toBe('mail');
      expect(groupIds()).toContain('mail');
      expect(groupIds()).not.toContain('fields');
    });


    it('switches to Camel, dropping the mail fields', async function() {

      // given
      const task = await selectAndOpen('send', 'flowable-implementation');

      // when
      await changeInput(panel.input('flowable-implementationType'), 'camel');

      // then
      const bo = task.businessObject;

      expect(bo.get('flowable:type')).toBe('camel');
      expect(bo.get('extensionElements')).toBeUndefined();
      expect(Object.keys(bo.$attrs)).toEqual([]);
      expect(groupIds()).toContain('camel');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<sendTask id="send" flowable:type="camel" />');
    });

  });


  describe('receive task', function() {

    it('shows the event, output and correlation', async function() {

      // when
      await selectAndOpen('receive', 'flowable-receiveTask');

      // then
      expect(panel.input('flowable-eventType').value).toBe('orderShipped');
      expect(panel.input('flowable-skipExpression').value).toBe('${skipWait}');

      await openItem(panel.panel, 'receive-flowable-eventOut-0');
      await openItem(panel.panel, 'receive-flowable-eventCorrelation-0');

      expect(panel.input('receive-flowable-eventOut-0-source').value).toBe('trackingNumber');
      expect(panel.input('receive-flowable-eventCorrelation-0-value').value).toBe('${orderId}');
    });


    it('edits the event and adds a correlation parameter', async function() {

      // given
      const task = await selectAndOpen('receive', 'flowable-receiveTask');

      // when
      await changeInput(panel.input('flowable-eventName'), 'Order shipped');
      await changeInput(panel.input('flowable-eventType'), '');
      await addListItem(panel.group('flowable-eventCorrelation'));
      await openItem(panel.panel, 'receive-flowable-eventCorrelation-1');
      await changeInput(panel.input('receive-flowable-eventCorrelation-1-name'), 'customerId');

      // then
      const bo = task.businessObject;

      expect(getExtensionElement(bo, 'flowable:EventName').get('body')).toBe('Order shipped');
      expect(getExtensionElement(bo, 'flowable:EventType')).toBeUndefined();
      expect(getExtensionElementsList(bo, 'flowable:EventCorrelationParameter')[1].get('name')).toBe('customerId');
    });

  });

});
