/**
 * Enterprise API Response Test Suite
 * 
 * Covers: Success and failure response formats, error code validation,
 * and response type safety.
 */
import { describe, it, expect } from "vitest";
import { success, failure, type ApiErrorCode } from "@/lib/api";

describe("API Response Module", () => {
  describe("Success Responses", () => {
    it("should create success response with data", () => {
      const testData = { id: "123", name: "Test Project" };
      const response = success(testData);

      expect(response).toEqual({
        data: testData,
        error: null,
      });
    });

    it("should handle primitive data types", () => {
      expect(success("string")).toEqual({ data: "string", error: null });
      expect(success(123)).toEqual({ data: 123, error: null });
      expect(success(true)).toEqual({ data: true, error: null });
      expect(success(null)).toEqual({ data: null, error: null });
    });

    it("should handle arrays", () => {
      const testArray = [{ id: 1 }, { id: 2 }];
      const response = success(testArray);

      expect(response.data).toHaveLength(2);
      expect(response.error).toBeNull();
    });

    it("should handle nested objects", () => {
      const nestedData = {
        user: {
          profile: {
            settings: {
              theme: "dark",
            },
          },
        },
      };
      const response = success(nestedData);

      expect(response.data.user.profile.settings.theme).toBe("dark");
      expect(response.error).toBeNull();
    });

    it("should handle empty objects and arrays", () => {
      expect(success({})).toEqual({ data: {}, error: null });
      expect(success([])).toEqual({ data: [], error: null });
    });
  });

  describe("Failure Responses", () => {
    it("should create failure response with error code and message", () => {
      const response = failure("VALIDATION_ERROR", "Invalid input provided");

      expect(response).toEqual({
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input provided",
        },
      });
    });

    it("should include details when provided", () => {
      const details = { field: "email", issue: "invalid format" };
      const response = failure("VALIDATION_ERROR", "Validation failed", details);

      expect(response.error.details).toEqual(details);
    });

    it("should handle all valid error codes", () => {
      const errorCodes: ApiErrorCode[] = [
        "VALIDATION_ERROR",
        "RATE_LIMITED",
        "DEPENDENCY_FAILURE",
        "INTERNAL_ERROR",
        "EMAIL_NOT_VERIFIED",
        "ACCOUNT_LOCKED",
        "TWO_FACTOR_REQUIRED",
      ];

      errorCodes.forEach((code) => {
        const response = failure(code, "Test message");
        expect(response.error.code).toBe(code);
        expect(response.data).toBeNull();
      });
    });

    it("should handle complex error details", () => {
      const complexDetails = {
        fields: [
          { name: "email", errors: ["Required", "Invalid format"] },
          { name: "password", errors: ["Too short"] },
        ],
        nested: {
          deep: {
            value: 123,
          },
        },
      };

      const response = failure("VALIDATION_ERROR", "Validation failed", complexDetails);

      expect(response.error.details).toEqual(complexDetails);
    });
  });

  describe("Response Type Safety", () => {
    it("should maintain type consistency in success response", () => {
      interface Project {
        id: string;
        name: string;
        budget: number;
      }

      const project: Project = {
        id: "proj-123",
        name: "Test Project",
        budget: 50000,
      };

      const response = success(project);

      // TypeScript should enforce these properties exist
      expect(response.data.id).toBe("proj-123");
      expect(response.data.name).toBe("Test Project");
      expect(response.data.budget).toBe(50000);
      expect(response.error).toBeNull();
    });

    it("should allow type narrowing with error responses", () => {
      const response = failure("RATE_LIMITED", "Too many requests");

      if (response.error) {
        expect(response.error.code).toBe("RATE_LIMITED");
        expect(response.data).toBeNull();
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty string messages", () => {
      const response = failure("INTERNAL_ERROR", "");

      expect(response.error.message).toBe("");
      expect(response.error.code).toBe("INTERNAL_ERROR");
    });

    it("should handle very long messages", () => {
      const longMessage = "A".repeat(10000);
      const response = failure("INTERNAL_ERROR", longMessage);

      expect(response.error.message).toHaveLength(10000);
    });

    it("should handle undefined details gracefully", () => {
      const response = failure("VALIDATION_ERROR", "Error message", undefined);

      expect(response.error.details).toBeUndefined();
    });

    it("should handle null details", () => {
      const response = failure("VALIDATION_ERROR", "Error message", null);

      expect(response.error.details).toBeNull();
    });
  });
});
