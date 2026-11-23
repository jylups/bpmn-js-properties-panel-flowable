import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { getExtensionElement } from '../index.js';

import { changeInput, createModeler, destroyModeler, openGroup, tick } from './helper.js';

import xml from './fixtures/general-async.bpmn?raw';


describe('Flowable general and async groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);


  describe('provider', function() {

    it('adds the Flowable groups after the BPMN groups for flow nodes', async function() {

      // when
      await panel.select('plainTask');

      // then
      const groupIds = [ ...panel.panel.querySelectorAll('[data-group-id]') ].map(node => node.dataset.groupId);

      expect(groupIds[0]).toBe('group-general');
      expect(groupIds.slice(-2)).toEqual([ 'group-flowable-general', 'group-flowable-async' ]);
    });


    it('adds no Flowable groups to the process', async function() {

      // when
      await panel.select(null);

      // then
      expect(panel.group('flowable-general')).toBeNull();
      expect(panel.group('flowable-async')).toBeNull();
    });


    it('offers the job settings of activities only', async function() {

      // when
      await panel.select('gateway');
      await openGroup(panel.group('flowable-async'));

      // then
      expect(panel.entry('flowable-async')).not.toBeNull();
      expect(panel.entry('flowable-failedJobRetryTimeCycle')).toBeNull();
      expect(panel.entry('flowable-jobCategory')).not.toBeNull();
    });

  });


  describe('async', function() {

    it('shows the existing values', async function() {

      // when
      await panel.select('asyncTask');
      await openGroup(panel.group('flowable-async'));

      // then
      expect(panel.input('flowable-async').checked).toBe(true);
      expect(panel.input('flowable-exclusive').checked).toBe(false);
      expect(panel.input('flowable-failedJobRetryTimeCycle').value).toBe('R5/PT7M');
      expect(panel.input('flowable-jobCategory').value).toBe('reports');
    });


    it('sets async and then offers exclusive', async function() {

      // given
      const task = await panel.select('plainTask');
      await openGroup(panel.group('flowable-async'));

      expect(panel.entry('flowable-exclusive')).toBeNull();

      // when
      await changeInput(panel.input('flowable-async'), true);

      // then
      expect(task.businessObject.get('flowable:async')).toBe(true);
      expect(panel.entry('flowable-exclusive')).not.toBeNull();
    });


    it('removes async instead of writing false, and undoes', async function() {

      // given
      const task = await panel.select('asyncTask');
      await openGroup(panel.group('flowable-async'));

      // when
      await changeInput(panel.input('flowable-async'), false);

      // then
      expect(task.businessObject.get('flowable:async')).toBeUndefined();

      // when
      panel.get('commandStack').undo();
      await tick();

      // then
      expect(task.businessObject.get('flowable:async')).toBe(true);
    });


    it('sets asyncLeave and offers the exclusive leave', async function() {

      // given
      const task = await panel.select('plainTask');
      await openGroup(panel.group('flowable-async'));

      // when
      await changeInput(panel.input('flowable-asyncLeave'), true);
      await changeInput(panel.input('flowable-asyncLeaveExclusive'), true);

      // then
      expect(task.businessObject.get('flowable:asyncLeave')).toBe(true);
      expect(task.businessObject.get('flowable:asyncLeaveExclusive')).toBe(true);
    });

  });


  describe('extension element bodies', function() {

    it('creates the retry cycle and bpmn:ExtensionElements, and undoes both in one step', async function() {

      // given
      const task = await panel.select('plainTask');
      await openGroup(panel.group('flowable-async'));

      // when
      await changeInput(panel.input('flowable-failedJobRetryTimeCycle'), 'R3/PT10M');

      // then
      const cycle = getExtensionElement(task.businessObject, 'flowable:FailedJobRetryTimeCycle');

      expect(cycle.get('body')).toBe('R3/PT10M');

      // when
      panel.get('commandStack').undo();

      // then
      expect(task.businessObject.get('extensionElements')).toBeUndefined();
    });


    it('updates an existing job category', async function() {

      // given
      const task = await panel.select('asyncTask');
      await openGroup(panel.group('flowable-async'));

      // when
      await changeInput(panel.input('flowable-jobCategory'), '${category}');

      // then
      expect(getExtensionElement(task.businessObject, 'flowable:JobCategory').get('body')).toBe('${category}');
    });


    it('removes the element when cleared, and bpmn:ExtensionElements once empty', async function() {

      // given
      const task = await panel.select('plainTask');
      await openGroup(panel.group('flowable-async'));
      await changeInput(panel.input('flowable-jobCategory'), 'reports');

      // when
      await changeInput(panel.input('flowable-jobCategory'), '');

      // then
      expect(task.businessObject.get('extensionElements')).toBeUndefined();
    });


    it('marks an invalid retry cycle', async function() {

      // given
      await panel.select('plainTask');
      await openGroup(panel.group('flowable-async'));

      // when
      await changeInput(panel.input('flowable-failedJobRetryTimeCycle'), 'every five minutes');

      // then: the bpmn.io panel keeps the typed value and marks the entry
      expect(panel.entry('flowable-failedJobRetryTimeCycle').classList.contains('has-error')).toBe(true);
    });


    it('accepts a valid retry cycle without an error', async function() {

      // given
      await panel.select('plainTask');
      await openGroup(panel.group('flowable-async'));

      // when
      await changeInput(panel.input('flowable-failedJobRetryTimeCycle'), 'R2/PT1H');

      // then
      expect(panel.entry('flowable-failedJobRetryTimeCycle').classList.contains('has-error')).toBe(false);
    });

  });


  describe('general', function() {

    it('shows and edits the multi-line name', async function() {

      // given
      const task = await panel.select('asyncTask');
      await openGroup(panel.group('flowable-general'));

      expect(panel.input('flowable-elementName').value).toBe('Two\nlines');

      // when
      await changeInput(panel.input('flowable-elementName'), 'Three\nshort\nlines');

      // then
      expect(getExtensionElement(task.businessObject, 'flowable:Element-name').get('body')).toBe('Three\nshort\nlines');
    });


    it('selects the history override', async function() {

      // given
      const task = await panel.select('asyncTask');
      await openGroup(panel.group('flowable-general'));

      expect(panel.input('flowable-includeInHistory').value).toBe('false');

      // when
      await changeInput(panel.input('flowable-includeInHistory'), 'true');

      // then
      expect(getExtensionElement(task.businessObject, 'flowable:IncludeInHistory').get('body')).toBe('true');

      // when
      await changeInput(panel.input('flowable-includeInHistory'), '');

      // then
      expect(getExtensionElement(task.businessObject, 'flowable:IncludeInHistory')).toBeUndefined();
    });

  });

});
