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
