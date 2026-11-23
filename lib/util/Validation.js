/**
 * Validators for panel entries. Each takes (value, translate) and returns an
 * error message, or nothing when the value is fine. The bpmn.io panel still
 * writes an invalid value and marks the entry with the error.
 */

const ISO_DURATION = /^P(?!$)(\d+Y)?(\d+M)?(\d+W)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+(\.\d+)?S)?)?$/;

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/;

/**
 * Whether the whole value is one ${…} or #{…} expression.
 */
export function isExpression(value) {
  return /^\s*[$#]\{[\s\S]*\}\s*$/.test(value || '');
}

/**
 * Every ${ or #{ must be closed, counting nested braces as JUEL does.
 */
export function expressions(value, translate) {
  if (!value) {
    return;
  }

  let depth = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];

    if (depth === 0) {
      if ((char === '$' || char === '#') && value[i + 1] === '{') {
        depth = 1;
        i++;
      }
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
    }
  }

  if (depth > 0) {
    return translate('Close the expression with }.');
  }
}

export function required(value, translate) {
  if (!value || !value.trim()) {
    return translate('Must not be empty.');
  }
}

/**
 * An ISO 8601 date, date-time or duration (P2DT4H), or an expression.
 */
export function dateOrDuration(value, translate) {
  if (!value || isExpression(value)) {
    return;
  }

  const trimmed = value.trim();

  if (!ISO_DURATION.test(trimmed) && !ISO_DATE.test(trimmed)) {
    return translate('Must be an ISO 8601 date or duration, for example 2026-12-31T17:00:00 or P2DT4H, or an expression.');
  }
}

/**
 * An ISO 8601 date or date-time, or an expression.
 */
export function date(value, translate) {
  if (!value || isExpression(value)) {
    return;
  }

  if (!ISO_DATE.test(value.trim())) {
    return translate('Must be an ISO 8601 date, for example 2026-12-31T17:00:00, or an expression.');
  }
}

/**
 * The first error of several validators.
 */
export function all(...validators) {
  const active = validators.filter(Boolean);

  return (value, translate) => {
    for (const validate of active) {
      const error = validate(value, translate);

      if (error) {
        return error;
      }
    }
  };
}
