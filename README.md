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
| Asynchronous execution | flow nodes | `async`, `exclusive`, `asyncLeave`, `asyncLeaveExclusive`, retry time cycle (activities), job category |

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
