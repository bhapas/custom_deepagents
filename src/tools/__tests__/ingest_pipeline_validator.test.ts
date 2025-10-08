import { describe, it, expect, beforeEach } from "@jest/globals";

/**
 * Unit tests for unique fields extraction logic from ingest_pipeline_validator
 */
describe("Unique Fields Extraction", () => {
  let uniqueFields: Record<string, any>;

  beforeEach(() => {
    uniqueFields = {};
  });

  /**
   * Helper function to check if a value is empty
   */
  const isEmptyValue = (value: any): boolean => {
    if (value == null) return true;
    if (typeof value === "string") return value.trim() === "";
    return false;
  };

  /**
   * Helper function to recursively clean empty values from objects
   */
  const cleanEmptyValues = (value: any): any => {
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
  };

  /**
   * Helper function that mimics the unique fields extraction logic
   */
  const extractUniqueFields = (
    results: Array<{ doc?: { _source?: { message?: any } } }>,
    uniqueFields: Record<string, any>
  ) => {
    results.forEach((result) => {
      const message = result.doc?._source?.message;
      // Early return if message doesn't exist or isn't an object
      if (!message || typeof message !== "object") {
        return;
      }
      Object.keys(message).forEach((key) => {
        // Skip if key already exists in uniqueFields
        if (key in uniqueFields) {
          return;
        }
        const cleanedValue = cleanEmptyValues(message[key]);
        // Skip if value is empty after cleaning
        if (cleanedValue === undefined) {
          return;
        }
        uniqueFields[key] = cleanedValue;
      });
    });
  };

  it("should extract simple key-value pairs", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              connection_id: 0,
              event: "startup",
              id: 123,
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      connection_id: 0,
      event: "startup",
      id: 123,
    });
  });

  it("should extract nested object values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              startup_data: {
                mysql_version: "8.0.22-commercial",
                args: ["/usr/local/mysql/bin/mysqld"],
                server_id: 1,
              },
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields.startup_data).toEqual({
      mysql_version: "8.0.22-commercial",
      args: ["/usr/local/mysql/bin/mysqld"],
      server_id: 1,
    });
  });

  it("should skip null values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
              null_field: null,
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
    expect(uniqueFields).not.toHaveProperty("null_field");
  });

  it("should skip undefined values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
              undefined_field: undefined,
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
    expect(uniqueFields).not.toHaveProperty("undefined_field");
  });

  it("should skip empty string values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
              empty_field: "",
              whitespace_field: "   ",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
    expect(uniqueFields).not.toHaveProperty("empty_field");
    expect(uniqueFields).not.toHaveProperty("whitespace_field");
  });

  it("should keep zero values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              connection_id: 0,
              count: 0,
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      connection_id: 0,
      count: 0,
    });
  });

  it("should only keep first occurrence of each key", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              connection_id: 0,
              event: "startup",
            },
          },
        },
      },
      {
        doc: {
          _source: {
            message: {
              connection_id: 999, // Should be ignored
              new_field: "new",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      connection_id: 0, // First value kept
      event: "startup",
      new_field: "new",
    });
  });

  it("should handle missing doc property", () => {
    const results = [
      {
        // Missing doc
      },
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
  });

  it("should handle missing _source property", () => {
    const results = [
      {
        doc: {
          // Missing _source
        },
      },
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
  });

  it("should handle missing message property", () => {
    const results = [
      {
        doc: {
          _source: {
            // Missing message
          },
        },
      },
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
  });

  it("should handle non-object message", () => {
    const results = [
      {
        doc: {
          _source: {
            message: "string message", // Not an object
          },
        },
      },
      {
        doc: {
          _source: {
            message: {
              valid_field: "value",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({
      valid_field: "value",
    });
  });

  it("should handle complex nested structures", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              connection_id: 0,
              startup_data: {
                mysql_version: "8.0.22-commercial",
                args: [
                  "/usr/local/mysql/bin/mysqld",
                  "--loose-audit-log-format=JSON",
                ],
                server_id: 1,
                os_version: "x86_64-Linux",
              },
              login: {
                proxy: "",
                os: "",
                user: "",
                ip: "",
              },
              account: {
                host: "",
                user: "skip-grants user",
              },
              timestamp: "2020-10-19 19:21:33",
            },
          },
        },
      },
      {
        doc: {
          _source: {
            message: {
              connection_id: 1,
              login: {
                proxy: "nginx",
                os: "Linux",
                user: "admin",
                ip: "192.168.1.100",
              },
              account: {
                host: "localhost",
                user: "root",
              },
              query: "SELECT * FROM users",
              timestamp: "2020-10-19 19:22:15",
            },
          },
        },
      },
      {
        doc: {
          _source: {
            message: {
              connection_id: 2,
              event: "disconnect",
              session_id: "abc123",
              timestamp: "2020-10-19 19:23:00",
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    // connection_id from first result (value: 0)
    expect(uniqueFields.connection_id).toBe(0);
    
    // startup_data only in first result
    expect(uniqueFields.startup_data).toEqual({
      mysql_version: "8.0.22-commercial",
      args: ["/usr/local/mysql/bin/mysqld", "--loose-audit-log-format=JSON"],
      server_id: 1,
      os_version: "x86_64-Linux",
    });
    
    // timestamp from first result (first occurrence wins)
    expect(uniqueFields.timestamp).toBe("2020-10-19 19:21:33");
    
    // login from first result had all empty strings -> cleaned to undefined, skipped
    // login from second result has values -> captured
    expect(uniqueFields.login).toEqual({
      proxy: "nginx",
      os: "Linux",
      user: "admin",
      ip: "192.168.1.100",
    });
    
    // account from first result: empty "host" cleaned out, only "user" remains
    // (first occurrence wins - second result's account is ignored)
    expect(uniqueFields.account).toEqual({
      user: "skip-grants user",
    });
    
    // query only appears in second result
    expect(uniqueFields.query).toBe("SELECT * FROM users");
    
    // event and session_id only appear in third result
    expect(uniqueFields.event).toBe("disconnect");
    expect(uniqueFields.session_id).toBe("abc123");
  });

  it("should handle empty results array", () => {
    const results: Array<{ doc?: { _source?: { message?: any } } }> = [];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields).toEqual({});
  });

  it("should handle array values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              tags: ["tag1", "tag2", "tag3"],
              ports: [3306, 3307],
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields.tags).toEqual(["tag1", "tag2", "tag3"]);
    expect(uniqueFields.ports).toEqual([3306, 3307]);
  });

  it("should handle boolean values", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              is_active: true,
              is_deleted: false,
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    expect(uniqueFields.is_active).toBe(true);
    expect(uniqueFields.is_deleted).toBe(false);
  });

  it("should clean empty values from nested objects", () => {
    const results = [
      {
        doc: {
          _source: {
            message: {
              user: {
                name: "John",
                email: "",
                phone: null,
                address: {
                  street: "",
                  city: "NYC",
                  zip: "",
                },
              },
              metadata: {
                empty1: "",
                empty2: null,
                empty3: "   ",
              },
            },
          },
        },
      },
    ];

    extractUniqueFields(results, uniqueFields);

    // user object should have empty values cleaned out recursively
    expect(uniqueFields.user).toEqual({
      name: "John",
      address: {
        city: "NYC",
      },
    });
    
    // metadata with all empty values should not be included
    expect(uniqueFields).not.toHaveProperty("metadata");
  });
});

