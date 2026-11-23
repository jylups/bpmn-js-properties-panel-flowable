import { afterEach, describe, expect, it, vi } from 'vitest';

import { all, date, dateOrDuration, expressions, isExpression, required } from '../lib/util/Validation.js';

import {
  changeInput,
  createModeler,
  destroyModeler,
  openGroup,
  openItem
} from './helper.js';

import serviceTaskXml from './fixtures/service-task.bpmn?raw';
import userTaskXml from './fixtures/user-task.bpmn?raw';
import listenersXml from './fixtures/listeners.bpmn?raw';


const translate = text => text;


describe('validation', function() {

  describe('validators', function() {

    it('flags unclosed expressions', function() {
      expect(expressions('${a}', translate)).toBeUndefined();
      expect(expressions('Order ${order.id} of #{customer.name}', translate)).toBeUndefined();
      expect(expressions('${map.get({a: 1})}', translate)).toBeUndefined();
      expect(expressions('plain { text }', translate)).toBeUndefined();
      expect(expressions('${a', translate)).toBe('Close the expression with }.');
      expect(expressions('#{x.y({1)}', translate)).toBe('Close the expression with }.');
    });


    it('requires a value', function() {
      expect(required('x', translate)).toBeUndefined();
      expect(required('', translate)).toBe('Must not be empty.');
      expect(required('  ', translate)).toBe('Must not be empty.');
    });


    it('accepts ISO 8601 dates, durations and expressions', function() {
      for (const value of [ 'P2DT4H', 'PT30M', 'P1W', '2026-12-31', '2026-12-31T17:00', '2026-12-31T17:00:00Z', '${due}' ]) {
        expect(dateOrDuration(value, translate), value).toBeUndefined();
      }

      for (const value of [ 'P', 'PT', '2 days', 'tomorrow', '2026-1-1' ]) {
        expect(dateOrDuration(value, translate), value).toBeDefined();
      }

      expect(date('2026-12-31T23:59:59', translate)).toBeUndefined();
      expect(date('P1D', translate)).toBeDefined();
    });


    it('detects whole expressions and combines validators', function() {
      expect(isExpression(' ${a} ')).toBe(true);
      expect(isExpression('a ${b}')).toBe(false);
      expect(all(required, expressions)('', translate)).toBe('Must not be empty.');
      expect(all(required, expressions)('${', translate)).toBe('Close the expression with }.');
    });

  });


  describe('entries', function() {

    afterEach(destroyModeler);

    const hasError = (panel, id) => panel.entry(id).classList.contains('has-error');


    it('requires an implementation for a service task', async function() {

      // given
      const panel = await createModeler(serviceTaskXml);
      await panel.select('classTask');
      await openGroup(panel.group('flowable-implementation'));

      // when
      await changeInput(panel.input('flowable-implementationValue'), '');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'flowable-implementationValue')).toBe(true));

      // when
      await changeInput(panel.input('flowable-implementationType'), '');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'flowable-implementationType')).toBe(true));
    });


    it('flags an unclosed expression in a typed field', async function() {

      // given
      const panel = await createModeler(serviceTaskXml);
      await panel.select('mailTask');
      await openGroup(panel.group('flowable-mail'));

      // when
      await changeInput(panel.input('flowable-field-subject'), 'Order ${orderId');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'flowable-field-subject')).toBe(true));
    });


    it('checks the due date of a user task', async function() {

      // given
      const panel = await createModeler(userTaskXml);
      await panel.select('review');
      await openGroup(panel.group('flowable-userTask'));

      // when
      await changeInput(panel.input('flowable-dueDate'), 'in two days');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'flowable-dueDate')).toBe(true));

      // when
      await changeInput(panel.input('flowable-dueDate'), '${dueDate}');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'flowable-dueDate')).toBe(false));
    });


    it('requires the class of a listener', async function() {

      // given
      const panel = await createModeler(listenersXml);
      await panel.select(null);
      await openItem(panel.panel, 'process-flowable-executionListeners-0');

      // when
      await changeInput(panel.input('process-flowable-executionListeners-0-value'), '');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'process-flowable-executionListeners-0-value')).toBe(true));
    });


    it('requires a link type for a custom resource', async function() {

      // given
      const panel = await createModeler(userTaskXml);
      await panel.select('review');
      await openItem(panel.panel, 'review-flowable-customResource-0');

      // when
      await changeInput(panel.input('review-flowable-customResource-0-name'), '');

      // then
      await vi.waitFor(() => expect(hasError(panel, 'review-flowable-customResource-0-name')).toBe(true));
    });

  });

});
