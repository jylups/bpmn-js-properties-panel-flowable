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

import xml from './fixtures/call-activity.bpmn?raw';


describe('Flowable call activity and in/out mapping groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const mappings = (element, type) => getExtensionElementsList(element.businessObject, type);

  const titles = group => [ ...panel.group(group).querySelectorAll('.bio-properties-panel-collapsible-entry-header-title') ].map(n => n.textContent);

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


  describe('called process', function() {

    it('shows the call activity settings', async function() {

      // when
      await selectAndOpen('callChild', 'flowable-callActivity');

      // then
      expect(panel.input('flowable-calledElement').value).toBe('child');
      expect(panel.input('flowable-calledElementType').value).toBe('key');
      expect(panel.input('flowable-processInstanceName').value).toBe('Child of ${parentName}');
      expect(panel.input('flowable-businessKey').value).toBe('${orderId}');
      expect(panel.input('flowable-inheritVariables').checked).toBe(true);
      expect(panel.input('flowable-completeAsync').checked).toBe(true);
      expect(panel.input('flowable-sameDeployment').checked).toBe(false);
      expect(panel.input('flowable-idVariableName').value).toBe('childId');
    });


    it('edits and undoes', async function() {

      // given
      const call = await selectAndOpen('callChild', 'flowable-callActivity');
      const bo = call.businessObject;

      // when
      await changeInput(panel.input('flowable-calledElement'), 'invoice');
      await changeInput(panel.input('flowable-calledElementType'), '');
      await changeInput(panel.input('flowable-inheritBusinessKey'), true);
      await changeInput(panel.input('flowable-useLocalScopeForOutParameters'), true);
      await changeInput(panel.input('flowable-fallbackToDefaultTenant'), true);

      // then
      expect(bo.get('calledElement')).toBe('invoice');
      expect(bo.get('flowable:calledElementType')).toBeUndefined();
      expect(bo.get('flowable:inheritBusinessKey')).toBe(true);
      expect(bo.get('flowable:useLocalScopeForOutParameters')).toBe(true);
      expect(bo.get('flowable:fallbackToDefaultTenant')).toBe(true);

      // when
      await undoAll();

      // then
      expect(bo.get('calledElement')).toBe('child');
      expect(bo.get('flowable:calledElementType')).toBe('key');
      expect(bo.get('flowable:inheritBusinessKey')).toBeUndefined();
    });


    it('reads the legacy calledElementBinding and replaces it with sameDeployment', async function() {

      // given
      const call = await selectAndOpen('legacyCall', 'flowable-callActivity');
      const bo = call.businessObject;

      // then
      expect(panel.input('flowable-sameDeployment').checked).toBe(true);

      // when
      await changeInput(panel.input('flowable-sameDeployment'), false);
      await changeInput(panel.input('flowable-sameDeployment'), true);

      // then
      expect(bo.get('flowable:sameDeployment')).toBe(true);
      expect(bo.get('flowable:calledElementBinding')).toBeUndefined();
    });

  });


  describe('in/out mappings', function() {

    it('lists the mappings of a call activity', async function() {

      // when
      await panel.select('callChild');

      // then
      expect(titles('flowable-in')).toEqual([ 'customer → client', '${order.total * 2} → doubled' ]);
      expect(titles('flowable-out')).toEqual([ 'result → childResult' ]);

      await openItem(panel.panel, 'callChild-flowable-in-1');

      expect(panel.input('callChild-flowable-in-1-kind').value).toBe('variable');
      expect(panel.input('callChild-flowable-in-1-sourceExpression').value).toBe('${order.total * 2}');
      expect(panel.input('callChild-flowable-in-1-targetType').value).toBe('long');
    });


    it('shows all-variables and business key mappings', async function() {

      // when
      await panel.select('legacyCall');

      // then
      expect(titles('flowable-in')).toEqual([ 'All variables', 'Business key' ]);
      expect(titles('flowable-out')).toEqual([ 'All variables' ]);

      await openItem(panel.panel, 'legacyCall-flowable-in-1');
      await openItem(panel.panel, 'legacyCall-flowable-out-0');

      expect(panel.input('legacyCall-flowable-in-1-businessKey').value).toBe('${parentKey}');
      expect(panel.input('legacyCall-flowable-out-0-local').checked).toBe(true);
      expect(panel.input('legacyCall-flowable-in-1-source')).toBeNull();

      const outKinds = [ ...panel.input('legacyCall-flowable-out-0-kind').options ].map(o => o.value);

      expect(outKinds).toEqual([ 'variable', 'all' ]);
    });


    it('adds a variable mapping and switches it to all variables', async function() {

      // given
      const call = await panel.select('callChild');

      // when
      await addListItem(panel.group('flowable-out'));
      await openItem(panel.panel, 'callChild-flowable-out-1');
      await changeInput(panel.input('callChild-flowable-out-1-source'), 'total');
      await changeInput(panel.input('callChild-flowable-out-1-target'), 'childTotal');
      await changeInput(panel.input('callChild-flowable-out-1-transient'), true);

      // then
      let out = mappings(call, 'flowable:Out')[1];

      expect(out.get('source')).toBe('total');
      expect(out.get('target')).toBe('childTotal');
      expect(out.get('transient')).toBe(true);

      // when
      await changeInput(panel.input('callChild-flowable-out-1-kind'), 'all');

      // then
      out = mappings(call, 'flowable:Out')[1];

      expect(out.get('variables')).toBe('all');
      expect(out.get('source')).toBeUndefined();
      expect(out.get('transient')).toBeUndefined();

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:out variables="all" />');
    });


    it('offers in mappings on start events, script and case tasks', async function() {

      // start event
      await panel.select('start');
      expect(titles('flowable-in')).toEqual([ 'initialAmount → amount' ]);
      expect(panel.group('flowable-out')).toBeNull();

      // script task
      const script = await panel.select('script');
      await addListItem(panel.group('flowable-in'));
      expect(mappings(script, 'flowable:In')).toHaveLength(1);
      expect(panel.group('flowable-out')).toBeNull();

      // case task
      await panel.select('caseTask');
      expect(panel.group('flowable-in')).not.toBeNull();
      expect(panel.group('flowable-out')).not.toBeNull();

      // other elements
      await panel.select('task');
      expect(panel.group('flowable-in')).toBeNull();
    });

  });

});
