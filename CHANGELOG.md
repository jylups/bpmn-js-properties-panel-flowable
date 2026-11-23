# Changelog

All notable changes to this package are documented here.

## Unreleased

## 0.1.0-next.0

First prerelease: the Flowable groups for the extensions the open-source engine reads (see the [coverage matrix](https://github.com/jylups/bpmn-js-env/blob/main/docs/coverage.md)).

* `FEAT`: validate entries: required implementations, classes, names and keys, unclosed `${…}` expressions, and ISO 8601 dates and durations; a test checks that every type and property of the moddle descriptor is edited, except the listed Flowable Work/Design elements ([jylups/bpmn-js-env#32](https://github.com/jylups/bpmn-js-env/issues/32))
* `FEAT`: add the data object (type, default value), sequence flow (skip expression) and localization groups, and the scope of the referenced signal ([jylups/bpmn-js-env#31](https://github.com/jylups/bpmn-js-env/issues/31))
* `FEAT`: add the event groups: timer, signal, message, error and terminate options, variable listener events, event registry settings with event output and correlation parameters, and in/out mappings on catch, throw and end events ([jylups/bpmn-js-env#30](https://github.com/jylups/bpmn-js-env/issues/30))
* `FEAT`: add the multi-instance collection group (variable or expression, collection handler, element and index variables, async leave) and variable aggregations ([jylups/bpmn-js-env#29](https://github.com/jylups/bpmn-js-env/issues/29))
* `FEAT`: add the called process group and in/out mappings on call activities, case tasks, start events and script tasks ([jylups/bpmn-js-env#28](https://github.com/jylups/bpmn-js-env/issues/28))
* `FEAT`: add the script options, business rule, send task type and receive task groups ([jylups/bpmn-js-env#27](https://github.com/jylups/bpmn-js-env/issues/27))
* `FEAT`: add the service task groups: implementation type picker, fields of mail, HTTP, shell, Camel and decision tasks, HTTP handlers, case, external worker, send event, field injection, exception mapping and the form of form-aware service tasks ([jylups/bpmn-js-env#26](https://github.com/jylups/bpmn-js-env/issues/26))
* `FEAT`: add the user task groups: assignment, custom resources, task settings and form ([jylups/bpmn-js-env#25](https://github.com/jylups/bpmn-js-env/issues/25))
* `FEAT`: add the process, start event and form properties groups ([jylups/bpmn-js-env#24](https://github.com/jylups/bpmn-js-env/issues/24))
* `FEAT`: add the execution listener, task listener and event listener groups with field injection ([jylups/bpmn-js-env#23](https://github.com/jylups/bpmn-js-env/issues/23))
* `FEAT`: add the Flowable properties provider module and extension element helpers ([jylups/bpmn-js-env#21](https://github.com/jylups/bpmn-js-env/issues/21))
* `FEAT`: add the Flowable group (multi-line name, history override) and the Asynchronous execution group (async, exclusive, async leave, retry time cycle, job category) ([jylups/bpmn-js-env#22](https://github.com/jylups/bpmn-js-env/issues/22))
* `CHORE`: add the package scaffold: ESM package, lint and Vitest setup ([jylups/bpmn-js-env#3](https://github.com/jylups/bpmn-js-env/issues/3))
