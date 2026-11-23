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

import xml from './fixtures/multi-instance.bpmn?raw';


describe('Flowable multi-instance groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const loop = element => element.businessObject.get('loopCharacteristics');

  const aggregations = element => getExtensionElementsList(loop(element), 'flowable:VariableAggregation');

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


  describe('collection', function() {

    it('shows a collection expression and the variables', async function() {

      // when
      await selectAndOpen('review', 'flowable-multiInstance');

      // then
      expect(panel.input('flowable-collectionSource').value).toBe('attribute');
      expect(panel.input('flowable-collection').value).toBe('${reviewers}');
      expect(panel.input('flowable-elementVariable').value).toBe('reviewer');
      expect(panel.input('flowable-elementIndexVariable').value).toBe('reviewIndex');
      expect(panel.input('flowable-noWaitStatesAsyncLeave').checked).toBe(true);
      expect(panel.input('flowable-collectionHandlerType')).toBeNull();
    });


    it('shows a class handler with string input', async function() {

      // when
      await selectAndOpen('byClass', 'flowable-multiInstance');

      // then
      expect(panel.input('flowable-collectionSource').value).toBe('handler');
      expect(panel.input('flowable-collectionHandlerType').value).toBe('class');
      expect(panel.input('flowable-collectionHandler').value).toBe('org.example.CsvCollectionHandler');
      expect(panel.input('flowable-collectionInputType').value).toBe('string');
      expect(panel.input('flowable-collectionInput').value).toBe('a,b,c');
    });


    it('edits a delegate expression handler and its expression input', async function() {

      // given
      const task = await selectAndOpen('byDelegate', 'flowable-multiInstance');

      // then
      expect(panel.input('flowable-collectionHandlerType').value).toBe('delegateExpression');
      expect(panel.input('flowable-collectionInputType').value).toBe('expression');

      // when
      await changeInput(panel.input('flowable-collectionInputType'), 'string');
      await changeInput(panel.input('flowable-collectionHandlerType'), 'class');

      // then
      const handler = getExtensionElement(loop(task), 'flowable:Collection');

      expect(handler.get('string')).toBe('${orders.ids}');
      expect(handler.get('expression')).toBeUndefined();
      expect(handler.get('class')).toBe('${collectionHandler}');
      expect(handler.get('delegateExpression')).toBeUndefined();
    });


    it('switches from a handler to a variable and back', async function() {

      // given
      const task = await selectAndOpen('byClass', 'flowable-multiInstance');

      // when
      await changeInput(panel.input('flowable-collectionSource'), 'attribute');
      await changeInput(panel.input('flowable-collection'), 'orders');

      // then
      expect(loop(task).get('flowable:collection')).toBe('orders');
      expect(loop(task).get('extensionElements')).toBeUndefined();

      // when
      await changeInput(panel.input('flowable-collectionSource'), 'handler');
      await changeInput(panel.input('flowable-collectionHandler'), 'org.example.Split');

      // then
      expect(loop(task).get('flowable:collection')).toBeUndefined();
      expect(getExtensionElement(loop(task), 'flowable:Collection').get('class')).toBe('org.example.Split');

      // when
      await undoAll();

      // then
      expect(getExtensionElement(loop(task), 'flowable:Collection').get('class')).toBe('org.example.CsvCollectionHandler');
    });


    it('is only offered on multi-instance activities', async function() {

      // when
      await panel.select('plain');

      // then
      expect(panel.group('flowable-multiInstance')).toBeNull();
      expect(panel.group('flowable-variableAggregations')).toBeNull();
    });

  });


  describe('variable aggregations', function() {

    it('shows an aggregation with its variables', async function() {

      // given
      await panel.select('review');

      // when
      await openItem(panel.panel, 'review-flowable-variableAggregation-0');
      await openItem(panel.panel, 'review-flowable-variableAggregation-0-variables-variable-1');

      // then
      expect(panel.input('review-flowable-variableAggregation-0-target').value).toBe('reviews');
      expect(panel.input('review-flowable-variableAggregation-0-implementation').value).toBe('');
      expect(panel.input('review-flowable-variableAggregation-0-createOverviewVariable').checked).toBe(true);
      expect(panel.input('review-flowable-variableAggregation-0-variables-variable-1-sourceExpression').value).toBe('${comment.trim()}');
    });


    it('shows class and delegate expression aggregators', async function() {

      // given
      await panel.select('review');

      // when
      await openItem(panel.panel, 'review-flowable-variableAggregation-1');
      await openItem(panel.panel, 'review-flowable-variableAggregation-2');

      // then
      expect(panel.input('review-flowable-variableAggregation-1-implementation').value).toBe('class');
      expect(panel.input('review-flowable-variableAggregation-1-value').value).toBe('org.example.Aggregator');
      expect(panel.input('review-flowable-variableAggregation-2-value').value).toBe('${aggregator}');
    });


    it('adds an aggregation with a variable, written unprefixed', async function() {

      // given
      const task = await panel.select('byClass');

      // when
      await addListItem(panel.group('flowable-variableAggregations'));
      await openItem(panel.panel, 'byClass-flowable-variableAggregation-0');
      await changeInput(panel.input('byClass-flowable-variableAggregation-0-target'), 'results');

      panel.entry('byClass-flowable-variableAggregation-0-variables').querySelector('.bio-properties-panel-add-entry').click();
      await tick();
      await openItem(panel.panel, 'byClass-flowable-variableAggregation-0-variables-variable-0');
      await changeInput(panel.input('byClass-flowable-variableAggregation-0-variables-variable-0-source'), 'status');
      await changeInput(panel.input('byClass-flowable-variableAggregation-0-variables-variable-0-target'), 'state');

      // then
      const [ aggregation ] = aggregations(task);

      expect(aggregation.get('target')).toBe('results');
      expect(aggregation.get('bpmn:variable')[0].get('source')).toBe('status');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:variableAggregation target="results"><variable source="status" target="state" /></flowable:variableAggregation>');
    });


    it('switches the aggregator and removes a variable', async function() {

      // given
      const task = await panel.select('review');
      await openItem(panel.panel, 'review-flowable-variableAggregation-0');

      // when
      await changeInput(panel.input('review-flowable-variableAggregation-0-implementation'), 'delegateExpression');
      await changeInput(panel.input('review-flowable-variableAggregation-0-value'), '${merge}');
      panel.entry('review-flowable-variableAggregation-0-variables').querySelector('.bio-properties-panel-remove-entry').click();
      await tick();

      // then
      const [ aggregation ] = aggregations(task);

      expect(aggregation.get('delegateExpression')).toBe('${merge}');
      expect(aggregation.get('bpmn:variable')).toHaveLength(1);
      expect(aggregation.get('bpmn:variable')[0].get('sourceExpression')).toBe('${comment.trim()}');
    });

  });

});
