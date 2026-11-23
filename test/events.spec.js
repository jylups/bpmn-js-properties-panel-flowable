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

import xml from './fixtures/events.bpmn?raw';


describe('Flowable event groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const definition = element => element.businessObject.get('eventDefinitions')[0];

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


  describe('event definitions', function() {

    it('shows and edits timer options', async function() {

      // given
      const timer = await selectAndOpen('reminder', 'flowable-eventDefinition');

      // then
      expect(panel.group('flowable-eventDefinition').textContent).toContain('Timer options');
      expect(panel.input('flowable-businessCalendarName').value).toBe('workdays');
      expect(panel.input('flowable-timeCycleEndDate').value).toBe('2026-12-31T23:59:59');

      // when
      await changeInput(panel.input('flowable-timeCycleEndDate'), '${cycleEnd}');
      await changeInput(panel.input('flowable-businessCalendarName'), '');

      // then
      expect(definition(timer).get('timeCycle').get('flowable:endDate')).toBe('${cycleEnd}');
      expect(definition(timer).get('flowable:businessCalendarName')).toBeUndefined();

      // when
      await undoAll();

      // then
      expect(definition(timer).get('flowable:businessCalendarName')).toBe('workdays');
    });


    it('shows the signal expression and async on a throw event', async function() {

      // given
      const raise = await selectAndOpen('raise', 'flowable-eventDefinition');

      // then
      expect(panel.input('flowable-signalExpression').value).toBe('${alertName}');
      expect(panel.input('flowable-signalAsync').checked).toBe(true);

      // when
      await changeInput(panel.input('flowable-signalAsync'), false);

      // then
      expect(definition(raise).get('flowable:async')).toBeUndefined();
    });


    it('edits the message expression', async function() {

      // given
      const wait = await selectAndOpen('waitMessage', 'flowable-eventDefinition');

      // when
      await changeInput(panel.input('flowable-messageExpression'), '${messageName}');

      // then
      expect(definition(wait).get('flowable:messageExpression')).toBe('${messageName}');
    });


    it('shows and edits error variable options on a catching error event', async function() {

      // given
      const failed = await selectAndOpen('failed', 'flowable-eventDefinition');

      // then
      expect(panel.input('flowable-errorVariableName').value).toBe('paymentFailure');
      expect(panel.input('flowable-errorVariableTransient').checked).toBe(true);

      // when
      await changeInput(panel.input('flowable-errorVariableLocalScope'), true);

      // then
      expect(definition(failed).get('flowable:errorVariableLocalScope')).toBe(true);
    });


    it('shows and edits terminate options', async function() {

      // given
      const stop = await selectAndOpen('stop', 'flowable-eventDefinition');

      // then
      expect(panel.input('flowable-terminateAll').checked).toBe(true);

      // when
      await changeInput(panel.input('flowable-terminateMultiInstance'), true);

      // then
      expect(definition(stop).get('flowable:terminateMultiInstance')).toBe(true);
    });


    it('is not offered without an event definition', async function() {

      // when
      await panel.select('plainEnd');

      // then
      expect(panel.group('flowable-eventDefinition')).toBeNull();
    });

  });


  describe('variable listener', function() {

    it('shows and edits a variable listener event', async function() {

      // given
      const watch = await selectAndOpen('watch', 'flowable-variableListener');

      // then
      expect(panel.input('flowable-variableListener').checked).toBe(true);
      expect(panel.input('flowable-variableName').value).toBe('status');
      expect(panel.input('flowable-variableChangeType').value).toBe('update-create');
      expect(groupIds()).not.toContain('eventRegistry');

      // when
      await changeInput(panel.input('flowable-variableChangeType'), 'delete');

      // then
      expect(getExtensionElement(watch.businessObject, 'flowable:VariableListenerEventDefinition').get('variableChangeType')).toBe('delete');
    });


    it('turns a plain catch event into a variable listener and back', async function() {

      // given
      const plain = await selectAndOpen('plainCatch', 'flowable-variableListener');

      // when
      await changeInput(panel.input('flowable-variableListener'), true);
      await changeInput(panel.input('flowable-variableName'), 'amount');

      // then
      expect(getExtensionElement(plain.businessObject, 'flowable:VariableListenerEventDefinition').get('variableName')).toBe('amount');
      expect(groupIds()).not.toContain('eventRegistry');

      // when
      await changeInput(panel.input('flowable-variableListener'), false);

      // then
      expect(plain.businessObject.get('extensionElements')).toBeUndefined();
      expect(groupIds()).toContain('eventRegistry');
    });


    it('is not offered on events with a definition or an event key', async function() {

      // when
      await panel.select('reminder');

      // then
      expect(panel.group('flowable-variableListener')).toBeNull();

      // when
      await panel.select('orderReceived');

      // then
      expect(panel.group('flowable-variableListener')).toBeNull();
    });

  });


  describe('event registry', function() {

    it('shows the start event registry settings, output and correlation', async function() {

      // given
      await selectAndOpen('orderReceived', 'flowable-eventRegistry');

      // then
      expect(panel.input('flowable-eventType').value).toBe('orderCreated');
      expect(panel.input('flowable-eventName').value).toBe('Order created');
      expect(panel.input('flowable-startEventCorrelationConfiguration').value).toBe('storeAsUniqueReferenceId');

      await openItem(panel.panel, 'orderReceived-flowable-eventOut-0');
      await openItem(panel.panel, 'orderReceived-flowable-eventCorrelation-0');

      expect(panel.input('orderReceived-flowable-eventOut-0-sourceType').value).toBe('double');
      expect(panel.input('orderReceived-flowable-eventCorrelation-0-type').value).toBe('string');
    });


    it('sets the event key of a plain catch event and adds output', async function() {

      // given
      const plain = await selectAndOpen('plainCatch', 'flowable-eventRegistry');

      // when
      await changeInput(panel.input('flowable-eventType'), 'paymentReceived');
      await addListItem(panel.group('flowable-eventOut'));
      await openItem(panel.panel, 'plainCatch-flowable-eventOut-0');
      await changeInput(panel.input('plainCatch-flowable-eventOut-0-source'), 'amount');

      // then
      const bo = plain.businessObject;

      expect(getExtensionElement(bo, 'flowable:EventType').get('body')).toBe('paymentReceived');
      expect(getExtensionElementsList(bo, 'flowable:EventOutParameter')[0].get('source')).toBe('amount');
      expect(panel.input('flowable-startEventCorrelationConfiguration')).toBeNull();
    });


    it('is not offered on throw events or events with a definition', async function() {

      // when
      await panel.select('plainEnd');

      // then
      expect(panel.group('flowable-eventRegistry')).toBeNull();

      // when
      await panel.select('waitMessage');

      // then
      expect(panel.group('flowable-eventRegistry')).toBeNull();
      expect(panel.group('flowable-eventOut')).toBeNull();
    });

  });


  describe('in/out mappings', function() {

    it('offers in mappings on catch events and out mappings on throw and end events', async function() {

      // catch events
      for (const id of [ 'reminder', 'plainCatch' ]) {
        await panel.select(id);
        expect(panel.group('flowable-in')).not.toBeNull();
        expect(panel.group('flowable-out')).toBeNull();
      }

      // throw and end events
      for (const id of [ 'raise', 'plainEnd' ]) {
        await panel.select(id);
        expect(panel.group('flowable-out')).not.toBeNull();
        expect(panel.group('flowable-in')).toBeNull();
      }
    });


    it('adds an out mapping to an end event', async function() {

      // given
      const end = await panel.select('plainEnd');

      // when
      await addListItem(panel.group('flowable-out'));
      await openItem(panel.panel, 'plainEnd-flowable-out-0');
      await changeInput(panel.input('plainEnd-flowable-out-0-source'), 'result');

      // then
      expect(getExtensionElementsList(end.businessObject, 'flowable:Out')[0].get('source')).toBe('result');
    });

  });

});
