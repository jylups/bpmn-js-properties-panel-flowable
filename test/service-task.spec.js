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

import xml from './fixtures/service-task.bpmn?raw';


describe('Flowable service task groups', function() {

  let panel;

  beforeEach(async function() {
    panel = await createModeler(xml);
  });

  afterEach(destroyModeler);

  const ext = (element, type) => getExtensionElementsList(element.businessObject, type);

  const field = (element, name) => ext(element, 'flowable:Field').find(f => f.get('name') === name);

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


  describe('implementation', function() {

    it('shows a Java class implementation with its fields and exception mapping', async function() {

      // when
      await selectAndOpen('classTask', 'flowable-implementation');

      // then
      expect(panel.input('flowable-implementationType').value).toBe('class');
      expect(panel.input('flowable-implementationValue').value).toBe('org.example.Charge');
      expect(panel.input('flowable-triggerable').checked).toBe(false);
      expect(panel.input('flowable-resultVariableName')).toBeNull();
      expect(groupIds()).toEqual([ 'general', 'implementation', 'fields', 'mapExceptions', 'form', 'async', 'executionListeners', 'localizations' ]);
    });


    it('shows the result variable alias of an expression and writes resultVariableName', async function() {

      // given
      const task = await selectAndOpen('exprTask', 'flowable-implementation');

      // then
      expect(panel.input('flowable-resultVariableName').value).toBe('total');

      // when
      await changeInput(panel.input('flowable-resultVariableName'), 'sum');
      await changeInput(panel.input('flowable-storeResultVariableAsTransient'), true);

      // then
      expect(task.businessObject.get('flowable:resultVariableName')).toBe('sum');
      expect(task.businessObject.get('flowable:resultVariable')).toBeUndefined();
      expect(task.businessObject.get('flowable:storeResultVariableAsTransient')).toBe(true);
    });


    it('switches from Java class to mail', async function() {

      // given
      const task = await selectAndOpen('classTask', 'flowable-implementation');

      // when
      await changeInput(panel.input('flowable-implementationType'), 'mail');

      // then
      expect(task.businessObject.get('flowable:class')).toBeUndefined();
      expect(task.businessObject.get('flowable:type')).toBe('mail');
      expect(groupIds()).toContain('mail');

      // the injected field is not a mail field, so it stays and is listed
      expect(groupIds()).toContain('fields');
      expect(panel.group('flowable-fields').textContent).toContain('Other fields');
    });


    it('drops the fields, attributes and elements of the previous type', async function() {

      // given
      const http = await selectAndOpen('httpTask', 'flowable-implementation');

      // when
      await changeInput(panel.input('flowable-implementationType'), 'delegateExpression');
      await changeInput(panel.input('flowable-implementationValue'), '${caller}');

      // then
      const bo = http.businessObject;

      expect(bo.get('flowable:type')).toBeUndefined();
      expect(bo.get('flowable:delegateExpression')).toBe('${caller}');
      expect(bo.get('flowable:parallelInSameTransaction')).toBeUndefined();
      expect(bo.get('extensionElements')).toBeUndefined();

      // when
      await undoAll();

      // then
      expect(bo.get('flowable:type')).toBe('http');
      expect(ext(http, 'flowable:HttpRequestHandler')).toHaveLength(1);
      expect(field(http, 'requestUrl')).toBeDefined();
    });


    it('keeps a type it does not know', async function() {

      // when
      await selectAndOpen('muleTask', 'flowable-implementation');

      // then
      expect(panel.input('flowable-implementationType').value).toBe('mule');
    });


    it('edits skip expression and extension ID', async function() {

      // given
      const task = await selectAndOpen('classTask', 'flowable-implementation');

      // when
      await changeInput(panel.input('flowable-skipExpression'), '${skip}');
      await changeInput(panel.input('flowable-triggerable'), true);

      // then
      expect(task.businessObject.get('flowable:skipExpression')).toBe('${skip}');
      expect(task.businessObject.get('flowable:triggerable')).toBe(true);
    });

  });


  describe('typed fields', function() {

    it('shows mail fields in their stored forms', async function() {

      // when
      await selectAndOpen('mailTask', 'flowable-mail');

      // then
      expect(panel.input('flowable-field-to').value).toBe('ops@example.com');
      expect(panel.input('flowable-field-subject').value).toBe('Order ${orderId}');
      expect(panel.input('flowable-field-ignoreException').checked).toBe(true);
      expect(panel.input('flowable-field-cc').value).toBe('');
    });


    it('writes a new field as a string or an expression child', async function() {

      // given
      const task = await selectAndOpen('mailTask', 'flowable-mail');

      // when
      await changeInput(panel.input('flowable-field-from'), 'noreply@example.com');
      await changeInput(panel.input('flowable-field-cc'), '${manager.email}');

      // then
      expect(field(task, 'from').get('string')).toBe('noreply@example.com');
      expect(field(task, 'cc').get('expressionElement').get('body')).toBe('${manager.email}');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:field name="from"><flowable:string>noreply@example.com</flowable:string></flowable:field>');
      expect(saved).toContain('<flowable:field name="cc"><flowable:expression>${manager.email}</flowable:expression></flowable:field>');
    });


    it('switches a field to an expression and removes it when cleared', async function() {

      // given
      const task = await selectAndOpen('mailTask', 'flowable-mail');

      // when
      await changeInput(panel.input('flowable-field-to'), '${customer.email}');

      // then
      expect(field(task, 'to').get('string')).toBeUndefined();
      expect(field(task, 'to').get('expressionElement').get('body')).toBe('${customer.email}');

      // when
      await changeInput(panel.input('flowable-field-to'), '');
      await changeInput(panel.input('flowable-field-ignoreException'), false);

      // then
      expect(field(task, 'to')).toBeUndefined();
      expect(field(task, 'ignoreException')).toBeUndefined();
    });


    it('shows a boolean that defaults to true as checked and writes false', async function() {

      // given
      const task = await selectAndOpen('shellTask', 'flowable-shell');

      // then
      expect(panel.input('flowable-field-wait').checked).toBe(false);
      expect(panel.input('flowable-field-redirectError').checked).toBe(false);

      // when
      await changeInput(panel.input('flowable-field-wait'), true);

      // then
      expect(field(task, 'wait')).toBeUndefined();
      expect(panel.input('flowable-field-wait').checked).toBe(true);
    });


    it('edits a boolean field set to an expression as text', async function() {

      // given
      const task = await selectAndOpen('mailTask', 'flowable-mail');

      panel.get('modeling').updateModdleProperties(task, field(task, 'ignoreException'), { string: '${lenient}' });
      await tick();

      // then
      expect(panel.input('flowable-field-ignoreException').type).not.toBe('checkbox');
      expect(panel.input('flowable-field-ignoreException').value).toBe('${lenient}');
    });


    it('shows the HTTP fields and parallel flag', async function() {

      // when
      await selectAndOpen('httpTask', 'flowable-http');

      // then
      expect(panel.input('flowable-field-requestMethod').value).toBe('GET');
      expect(panel.input('flowable-field-requestUrl').value).toBe('https://example.com/orders');
      expect(panel.input('flowable-parallelInSameTransaction').checked).toBe(true);
    });


    it('shows the decision table key', async function() {

      // when
      await selectAndOpen('dmnTask', 'flowable-dmn');

      // then
      expect(panel.input('flowable-field-decisionTableReferenceKey').value).toBe('risk');
    });

  });


  describe('HTTP handlers', function() {

    it('shows a class request handler with fields and a script response handler', async function() {

      // when
      await selectAndOpen('httpTask', 'flowable-httpHandlers');

      // then
      expect(panel.input('flowable-httpRequestHandler-type').value).toBe('class');
      expect(panel.input('flowable-httpRequestHandler-value').value).toBe('org.example.RequestHandler');
      expect(panel.entry('flowable-httpRequestHandler-fields')).not.toBeNull();
      expect(panel.input('flowable-httpResponseHandler-type').value).toBe('script');
      expect(panel.input('flowable-httpResponseHandler-script').value).toBe('execution.setVariable(\'ok\', true)');
    });


    it('switches a handler to a script and removes the other', async function() {

      // given
      const task = await selectAndOpen('httpTask', 'flowable-httpHandlers');

      // when
      await changeInput(panel.input('flowable-httpRequestHandler-type'), 'script');
      await changeInput(panel.input('flowable-httpRequestHandler-script'), 'request.addHeader("a", "b")');
      await changeInput(panel.input('flowable-httpResponseHandler-type'), '');

      // then
      const handler = getExtensionElement(task.businessObject, 'flowable:HttpRequestHandler');

      expect(handler.get('class')).toBeUndefined();
      expect(handler.get('type')).toBe('script');
      expect(handler.get('fields')).toEqual([]);
      expect(handler.get('script').get('body')).toBe('request.addHeader("a", "b")');
      expect(getExtensionElement(task.businessObject, 'flowable:HttpResponseHandler')).toBeUndefined();
    });

  });


  describe('case', function() {

    it('shows and edits the case settings', async function() {

      // given
      const task = await selectAndOpen('caseTask', 'flowable-case');

      // then
      expect(panel.input('flowable-caseDefinitionKey').value).toBe('claim');
      expect(panel.input('flowable-inheritVariables').checked).toBe(true);

      // when
      await changeInput(panel.input('flowable-idVariableName'), 'claimId');
      await changeInput(panel.input('flowable-caseSameDeployment'), true);

      // then
      expect(task.businessObject.get('flowable:idVariableName')).toBe('claimId');
      expect(task.businessObject.get('flowable:sameDeployment')).toBe(true);
    });

  });


  describe('external worker', function() {

    it('shows the topic and the parameter lists', async function() {

      // when
      await selectAndOpen('workerTask', 'flowable-externalWorker');

      // then
      expect(panel.input('flowable-topic').value).toBe('orders');
      expect(groupIds()).toEqual(expect.arrayContaining([ 'externalWorkerIn', 'externalWorkerOut' ]));

      await openItem(panel.panel, 'workerTask-flowable-externalWorkerOut-0');

      expect(panel.input('workerTask-flowable-externalWorkerOut-0-source').value).toBe('status');
      expect(panel.input('workerTask-flowable-externalWorkerOut-0-transient').checked).toBe(true);
    });


    it('adds an input parameter', async function() {

      // given
      const task = await panel.select('workerTask');

      // when
      await addListItem(panel.group('flowable-externalWorkerIn'));
      await openItem(panel.panel, 'workerTask-flowable-externalWorkerIn-1');
      await changeInput(panel.input('workerTask-flowable-externalWorkerIn-1-sourceExpression'), '${customer.id}');
      await changeInput(panel.input('workerTask-flowable-externalWorkerIn-1-target'), 'customerId');

      // then
      const parameter = ext(task, 'flowable:ExternalWorkerInParameter')[1];

      expect(parameter.get('sourceExpression')).toBe('${customer.id}');
      expect(parameter.get('target')).toBe('customerId');
    });

  });


  describe('send event', function() {

    it('shows the event, channels and trigger', async function() {

      // when
      await selectAndOpen('sendEventTask', 'flowable-sendEvent');

      // then
      expect(panel.input('flowable-eventType').value).toBe('orderCreated');
      expect(panel.input('flowable-channelKey').value).toBe('orders');
      expect(panel.input('flowable-systemChannel').checked).toBe(true);
      expect(panel.input('flowable-sendSynchronously').checked).toBe(false);
      expect(panel.input('flowable-triggerEventType').value).toBe('orderConfirmed');
      expect(groupIds()).toEqual(expect.arrayContaining([ 'eventIn', 'eventOut', 'triggerCorrelation' ]));
    });


    it('edits the send event elements', async function() {

      // given
      const task = await selectAndOpen('sendEventTask', 'flowable-sendEvent');

      // when
      await changeInput(panel.input('flowable-sendSynchronously'), true);
      await changeInput(panel.input('flowable-systemChannel'), false);
      await changeInput(panel.input('flowable-channelKey'), '');

      // then
      const bo = task.businessObject;

      expect(getExtensionElement(bo, 'flowable:SendSynchronously').get('body')).toBe('true');
      expect(getExtensionElement(bo, 'flowable:SystemChannel')).toBeUndefined();
      expect(getExtensionElement(bo, 'flowable:ChannelKey')).toBeUndefined();
    });


    it('hides the trigger settings when not triggerable', async function() {

      // given
      await selectAndOpen('sendEventTask', 'flowable-implementation');

      // when
      await changeInput(panel.input('flowable-triggerable'), false);

      // then
      expect(panel.input('flowable-triggerEventType')).toBeNull();
      expect(groupIds()).not.toContain('eventOut');
      expect(groupIds()).not.toContain('triggerCorrelation');
    });

  });


  describe('exception mapping', function() {

    it('shows a mapping', async function() {

      // given
      await panel.select('classTask');

      // when
      await openItem(panel.panel, 'classTask-flowable-mapException-0');

      // then
      expect(panel.input('classTask-flowable-mapException-0-errorCode').value).toBe('paymentFailed');
      expect(panel.input('classTask-flowable-mapException-0-class').value).toBe('org.example.PaymentException');
      expect(panel.input('classTask-flowable-mapException-0-includeChildExceptions').checked).toBe(true);
    });


    it('adds a mapping to a call activity', async function() {

      // given
      const call = await panel.select('call');

      // when
      await addListItem(panel.group('flowable-mapExceptions'));
      await openItem(panel.panel, 'call-flowable-mapException-0');
      await changeInput(panel.input('call-flowable-mapException-0-errorCode'), 'subFailed');
      await changeInput(panel.input('call-flowable-mapException-0-rootCause'), 'java.io.IOException');

      // then
      const [ mapping ] = ext(call, 'flowable:MapException');

      expect(mapping.get('errorCode')).toBe('subFailed');
      expect(mapping.get('rootCause')).toBe('java.io.IOException');

      const { xml: saved } = await panel.modeler.saveXML();

      expect(saved).toContain('<flowable:mapException errorCode="subFailed" rootCause="java.io.IOException" />');
    });

  });


  describe('form', function() {

    it('offers form key and validation on service tasks', async function() {

      // given
      const task = await selectAndOpen('classTask', 'flowable-form');

      // when
      await changeInput(panel.input('flowable-formKey'), 'paymentForm');

      // then
      expect(task.businessObject.get('flowable:formKey')).toBe('paymentForm');
      expect(panel.input('flowable-sameDeployment')).toBeNull();
    });

  });

});
