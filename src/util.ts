interface NestedObject {
  [key: string]: any;
}

export function mergeResults(objects: string[]): NestedObject {
  let result: NestedObject = {};

  for (const obj of objects) {
    const sample: NestedObject = JSON.parse(obj);
    result = merge(result, sample);
  }

  // Each chunk is used for the combinedSamples state when passed to the subgraph, which should be a nicely formatted string
  return result;
}

export function merge(
  target: Record<string, any>,
  source: Record<string, any>
): Record<string, unknown> {
  const filteredTarget = Object.create(null);

  for (const [key, targetValue] of Object.entries(target)) {
    if (!isUnsafeProperty(key, target)) {
      filteredTarget[key] = targetValue;
    }
  }

  for (const [key, sourceValue] of Object.entries(source)) {
    if (!isUnsafeProperty(key, source)) {
      const targetValue = filteredTarget[key];

      if (Array.isArray(sourceValue)) {
        filteredTarget[key] = [...sourceValue];
      } else if (isObject(sourceValue) && !Array.isArray(sourceValue)) {
        if (!isObject(targetValue) || isEmptyValue(targetValue)) {
          filteredTarget[key] = merge(Object.create(null), sourceValue);
        } else {
          filteredTarget[key] = merge(targetValue, sourceValue);
        }
      } else if (
        !(key in filteredTarget) ||
        (isEmptyValue(targetValue) && !isEmptyValue(sourceValue))
      ) {
        filteredTarget[key] = sourceValue;
      }
    }
  }

  return filteredTarget;
}

export function isUnsafeProperty(
  key: string,
  obj: Record<string, any>
): boolean {
  return (
    key === "__proto__" ||
    key === "constructor" ||
    key === "prototype" ||
    !Object.prototype.hasOwnProperty.call(obj, key)
  );
}

export function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

export function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (isObject(value)) {
    if (Array.isArray(value)) return value.length === 0;
    return value && Object.keys(value).length === 0;
  }
  return false;
}

// Helper function to recursively clean empty values from objects
export function cleanEmptyValues(value: any): any {
  if (value == null || (typeof value === "string" && value.trim() === "")) {
    return undefined;
  }
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value === "object") {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
      const cleanedValue = cleanEmptyValues(v);
      if (cleanedValue !== undefined) {
        cleaned[k] = cleanedValue;
      }
    }
    // Return undefined if object is empty after cleaning
    return Object.keys(cleaned).length > 0 ? cleaned : undefined;
  }
  return value;
}
