import { describe, expect, it } from 'vitest';

import flowableDescriptor from '@jylups/flowable-bpmn-moddle';


/**
 * Moddle types and properties the panel leaves out on purpose.
 */
const EXCLUDED = {
  'Work-form-field-validation': 'Flowable Work/Design, planned after the open-source engine scope',
  'Task-candidates-type': 'Flowable Work/Design, planned after the open-source engine scope',
  'Static-process-key': 'Flowable Work/Design, planned after the open-source engine scope',
  'Translation': 'Flowable Work/Design, planned after the open-source engine scope',
  'Condition': 'Flowable Work/Design condition builder, planned after the open-source engine scope',
  'EdgeDockers': 'diagram interchange: where an edge docks on its source and target, written by Flowable Design'
};

const sources = Object.values(import.meta.glob('../lib/**/*.js', { query: '?raw', import: 'default', eager: true })).join('\n');

const quoted = name => [ `'${ name }'`, `"${ name }"`, `\`${ name }\`` ].some(form => sources.includes(form));

const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Whether the panel source refers to a property: by its qualified name for
 * properties added to BPMN elements (flowable:assignee), by its name for
 * properties of Flowable elements (source, or `source:` in an object).
 */
function isReferenced(type, property) {
  const local = property.name.split(':').pop();

  if (type.extends) {
    return quoted(property.name.includes(':') ? property.name : `flowable:${ property.name }`) || quoted(local);
  }

  return quoted(property.name) || quoted(local) || new RegExp(`\\b${ escape(local) }\\s*:`).test(sources);
}


/**
 * A guard against Flowable extensions the panel does not edit: every type
 * and property of the moddle descriptor must be referenced by the panel
 * source, or be listed in EXCLUDED with a reason. The coverage matrix in
 * jylups/bpmn-js-env (docs/coverage.md) maps each of them to its entries.
 */
describe('coverage of the Flowable moddle descriptor', function() {

  const types = flowableDescriptor.types.filter(type => !EXCLUDED[type.name]);

  it('uses every concrete Flowable element type', function() {

    // given
    const concrete = types.filter(type => !type.isAbstract && !type.extends);

    // then
    const missing = concrete.filter(type => !quoted(`flowable:${ type.name }`)).map(type => type.name);

    expect(missing).toEqual([]);
  });


  it('edits every property', function() {

    // then
    const missing = types.flatMap(type => (type.properties || [])
      .filter(property => !isReferenced(type, property))
      .map(property => `${ type.name }#${ property.name }`));

    expect(missing).toEqual([]);
  });


  it('lists only exclusions that exist', function() {

    // then
    const names = flowableDescriptor.types.map(type => type.name);

    expect(Object.keys(EXCLUDED).filter(name => !names.includes(name))).toEqual([]);
  });

});
