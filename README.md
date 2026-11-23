# @jylups/bpmn-js-properties-panel-flowable

Flowable properties provider for bpmn-js-properties-panel.

> Work in progress, built in Phase 2 of the Flowable BPMN editor ([jylups/bpmn-js-env#20](https://github.com/jylups/bpmn-js-env/issues/20)). It is not published yet.

## Usage

```js
import Modeler from 'bpmn-js/lib/Modeler';
import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel';
import { FlowablePropertiesProviderModule } from '@jylups/bpmn-js-properties-panel-flowable';
import flowableDescriptor from '@jylups/flowable-bpmn-moddle';

const modeler = new Modeler({
  container: '#canvas',
  propertiesPanel: { parent: '#properties' },
  additionalModules: [
    BpmnPropertiesPanelModule,
    BpmnPropertiesProviderModule,
    FlowablePropertiesProviderModule
  ],
  moddleExtensions: {
    flowable: flowableDescriptor
  }
});
```

Include the panel's CSS (`@bpmn-io/properties-panel/dist/assets/properties-panel.css`) as for the bpmn.io panel.

## Groups

The Flowable groups come after the BPMN ones.

| Group | Elements | Entries |
|---|---|---|
| Flowable | flow elements | multi-line name (`element-name`), history override (`includeInHistory`) |
| Process | process, participant (its process) | candidate starter users and groups, potential starters (`user(…)`, `group(…)`), history level, eager execution fetching |
| Start | start events | initiator, form key, form field validation, form from the same deployment (checked by default, as in Flowable) |
| Assignment | user tasks | assignee, owner, candidate users, candidate groups |
| Custom resources | user tasks | link type and users and groups (`user(…)`, `group(…)`) of each `customResource` |
| Task | user tasks | due date, business calendar, priority, category, skip expression, task ID and completer variables, extension ID |
| Form | user tasks, service tasks | form key, form field validation, form from the same deployment (user tasks) |
| Implementation | service tasks | type (Java class, expression, delegate expression, mail, HTTP, shell, Camel, decision, case, send event, external worker; unknown types are kept), its value, result variable (expressions), triggerable, skip expression, extension ID. Changing the type drops the attributes, fields and elements of the previous one |
| Mail, HTTP, Shell, Camel, Decision | service and send tasks of that type | the fields the type reads, by name; `${…}` values are stored as expressions. HTTP adds parallel in the same transaction |
| HTTP handlers | HTTP tasks | request and response handler: Java class, delegate expression (with field injection) or script |
| Case | case tasks | case definition key, instance name, business key and inheritance, variables, same deployment, default tenant fallback, instance ID variable |
| External worker, Worker input, Worker output | external worker tasks | topic, do not include variables, in and out parameters |
| Send event, Event payload, Trigger event output, Trigger correlation | send event tasks | event key, channel keys, system channel, send synchronously, trigger event key, event in and out parameters, correlation parameters |
| Implementation (send tasks) | send tasks | type: mail, Camel or decision, with the matching field group |
| Script options | script tasks | result variable (the `resultVariableName` alias is read and replaced on edit), store script variables, do not include variables, skip expression |
| Business rule | business rule tasks | input variables, rules, exclude, result variable, Java class |
| Receive, Event output, Event correlation | receive tasks | event key, event name, skip expression, event out parameters, correlation parameters |
| Field injection | service and send tasks | fields of class and delegate expression implementations, and fields a typed task does not read (Other fields) |
| Exception mapping | service tasks, call activities | error code, exception class, include subclasses, root cause |
| Form properties | start events, user tasks | ID, name, type (built-in or custom), date pattern and lenient parsing (date), values (enum), variable, expression, default, readable, writable, required |
| Asynchronous execution | flow nodes | `async`, `exclusive`, `asyncLeave`, `asyncLeaveExclusive`, retry time cycle (activities), job category |
| Execution listeners | process, flow nodes, sequence flows | event, Java class / expression / delegate expression / script, transaction phase, custom properties resolver, field injection |
| Task listeners | user tasks | the same, with the task events create, assignment, complete, delete, all |
| Event listeners | process | events, entity type, Java class / delegate expression / thrown signal, global signal, message or error, transaction phase |

The coverage of all Flowable extensions is tracked in the [coverage matrix](https://github.com/jylups/bpmn-js-env/blob/main/docs/coverage.md).

## Extension element helpers

`getExtensionElementsList`, `getExtensionElement`, `addExtensionElementCommands`, `removeExtensionElementsCommands` and `setExtensionElementBody` are exported for custom entries. Changes made through them are one undo step.

## Development

Work in the [bpmn-js-env](https://github.com/jylups/bpmn-js-env) workspace, which links this package with the others and with the playground. Issues for this package are tracked there.

```sh
npm install
npm run lint
npm test
```

The tests run in headless Chromium through Playwright. Either install Playwright's Chromium once with `npx playwright install chromium`, or use an installed Google Chrome with `TEST_BROWSER_CHANNEL=chrome npm test`.

## License

MIT
