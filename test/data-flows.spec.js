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

import xml from './fixtures/data-flows.bpmn?raw';


describe('Flowable data object, signal, sequence flow and localization groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

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

  const localizations = bo => getExtensionElementsList(bo, 'flowable:Localization');


  describe('data object', function() {

    it('shows the type and default value', async function() {

      // when
      await selectAndOpen('thresholdRef', 'flowable-dataObject');

      // then
      const options = [ ...panel.input('flowable-dataObjectType').options ].map(o => o.value);

      expect(options).toEqual([ '', 'xsd:string', 'xsd:int', 'xsd:long', 'xsd:double', 'xsd:boolean', 'xsd:datetime', 'xsd:json' ]);
      expect(panel.input('flowable-dataObjectType').value).toBe('xsd:int');
      expect(panel.input('flowable-dataObjectValue').value).toBe('10');
    });


    it('edits the type and value of the data object, and undoes', async function() {

      // given
      const ref = await selectAndOpen('thresholdRef', 'flowable-dataObject');
      const dataObject = ref.businessObject.get('dataObjectRef');

      // when
      await changeInput(panel.input('flowable-dataObjectType'), 'xsd:datetime');
      await changeInput(panel.input('flowable-dataObjectValue'), '2026-01-01T00:00:00');

      // then
      expect(dataObject.get('itemSubjectRef')).toBe('xsd:datetime');
      expect(getExtensionElement(dataObject, 'flowable:Value').get('body')).toBe('2026-01-01T00:00:00');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<dataObject id="threshold" name="threshold" itemSubjectRef="xsd:datetime">');

      // when
      await changeInput(panel.input('flowable-dataObjectValue'), '');

      // then
      expect(dataObject.get('extensionElements')).toBeUndefined();

      // when
      await undoAll();

      // then
      expect(dataObject.get('itemSubjectRef')).toBe('xsd:int');
      expect(getExtensionElement(dataObject, 'flowable:Value').get('body')).toBe('10');
    });


    it('keeps a type it does not know', async function() {

      // when
      await selectAndOpen('customerRef', 'flowable-dataObject');

      // then
      expect(panel.input('flowable-dataObjectType').value).toBe('custom:Customer');
    });

  });


  describe('signal scope', function() {

    it('shows and edits the scope of the referenced signal', async function() {

      // given
      const raise = await selectAndOpen('raiseLocal', 'flowable-eventDefinition');
      const signal = raise.businessObject.get('eventDefinitions')[0].get('signalRef');

      // then
      expect(panel.input('flowable-signalScope').value).toBe('');

      // when
      await changeInput(panel.input('flowable-signalScope'), 'processInstance');

      // then
      expect(signal.get('flowable:scope')).toBe('processInstance');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<signal id="localSignal" name="local" flowable:scope="processInstance" />');
    });


    it('shows a global scope', async function() {

      // when
      await selectAndOpen('raise', 'flowable-eventDefinition');

      // then
      expect(panel.input('flowable-signalScope').value).toBe('global');
    });

  });


  describe('sequence flow', function() {

    it('shows and edits the skip expression', async function() {

      // given
      const flow = await selectAndOpen('toTask', 'flowable-sequenceFlow');

      // then
      expect(panel.input('flowable-skipExpression').value).toBe('${skipTask}');

      // when
      await changeInput(panel.input('flowable-skipExpression'), '');

      // then
      expect(flow.businessObject.get('flowable:skipExpression')).toBeUndefined();
    });

  });


  describe('localization', function() {

    it('shows the localization of a task with its documentation', async function() {

      // given
      await panel.select('task');

      // when
      await openItem(panel.panel, 'task-flowable-localization-0');

      // then
      expect(panel.input('task-flowable-localization-0-locale').value).toBe('es');
      expect(panel.input('task-flowable-localization-0-name').value).toBe('Revisar');
      expect(panel.input('task-flowable-localization-0-documentation').value).toBe('Revisar el pedido');
    });


    it('adds a localization to the process with documentation', async function() {

      // given
      await panel.select(null);

      // when
      await addListItem(panel.group('flowable-localizations'));
      await openItem(panel.panel, 'process-flowable-localization-1');
      await changeInput(panel.input('process-flowable-localization-1-locale'), 'fr');
      await changeInput(panel.input('process-flowable-localization-1-name'), 'Processus');
      await changeInput(panel.input('process-flowable-localization-1-documentation'), 'Un processus');

      // then
      const process = panel.element('process').businessObject;
      const [ , localization ] = localizations(process);

      expect(localization.get('locale')).toBe('fr');
      expect(localization.get('documentation').get('body')).toBe('Un processus');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:localization locale="fr" name="Processus"><flowable:documentation>Un processus</flowable:documentation></flowable:localization>');
    });


    it('removes the documentation when cleared', async function() {

      // given
      const task = await panel.select('task');
      await openItem(panel.panel, 'task-flowable-localization-0');

      // when
      await changeInput(panel.input('task-flowable-localization-0-documentation'), '');

      // then
      expect(localizations(task.businessObject)[0].get('documentation')).toBeUndefined();
    });


    it('localizes a data object', async function() {

      // given
      const ref = await panel.select('thresholdRef');

      // when
      await addListItem(panel.group('flowable-localizations'));

      // then
      const dataObject = ref.businessObject.get('dataObjectRef');

      expect(localizations(dataObject)).toHaveLength(1);
      expect(ref.businessObject.get('extensionElements')).toBeUndefined();
    });

  });

});
