/**
 * @file features/scoring/validators/scoringValidators.ts
 * @description Validation logic to ensure inputs fed into the scoring engine are sane.
 *
 * This provides robust server-side and client-side validation to catch
 * data integrity issues before running mathematical formulas.
 */

import type {
  GoalScoringInput,
  ScoringValidationResult,
  ScoringValidationError,
  ScoringValidationWarning,
} from "@/types";

/**
 * Validates an array of GoalScoringInputs for an entire cycle.
 * Checks for:
 *   - Missing required targets
 *   - Invalid weightages
 *   - Sum of weightages equaling 100
 *   - Division by zero conditions
 *   - Valid date formats
 *
 * @param inputs An array of GoalScoringInput to validate.
 * @returns A structured validation result containing success flag, errors, and warnings.
 */
export function validateScoringInput(inputs: GoalScoringInput[]): ScoringValidationResult {
  const errors: ScoringValidationError[] = [];
  const warnings: ScoringValidationWarning[] = [];

  let totalWeightage = 0;

  inputs.forEach((input, index) => {
    // 1. Weightage Validation
    if (input.weightage === null || input.weightage === undefined || Number.isNaN(input.weightage)) {
      errors.push({ 
        field: `inputs[${index}].weightage`, 
        code: "INVALID_WEIGHTAGE", 
        message: "Weightage is required and must be a number." 
      });
    } else {
      if (input.weightage <= 0 || input.weightage > 100) {
        errors.push({ 
          field: `inputs[${index}].weightage`, 
          code: "INVALID_WEIGHTAGE", 
          message: "Weightage must be between 0 and 100." 
        });
      }
      totalWeightage += input.weightage;
    }

    // 2. Unit of Measurement Specific Validations
    const isTargetBasedUom = ["numeric_max", "numeric_min", "percentage_max", "percentage_min"].includes(input.uomType);
    
    if (isTargetBasedUom) {
      if (input.targetValue === null || input.targetValue === undefined) {
        errors.push({ 
          field: `inputs[${index}].targetValue`, 
          code: "NULL_TARGET", 
          message: "Target value is required for this Unit of Measurement." 
        });
      } else if (input.targetValue === 0) {
        // Both Min and Max UoMs divide by target in some formulas, and zero target is logically unsound.
        errors.push({ 
          field: `inputs[${index}].targetValue`, 
          code: "DIVISION_BY_ZERO", 
          message: "Target value cannot be zero for Min/Max UoMs." 
        });
      }
      
      if (input.targetValue !== null && input.targetValue < 0) {
        warnings.push({ 
          field: `inputs[${index}].targetValue`, 
          message: "Target value is negative. Ensure this is intentional." 
        });
      }
    }

    if (input.uomType === "timeline") {
      if (!input.deadlineDate) {
        errors.push({ 
          field: `inputs[${index}].deadlineDate`, 
          code: "MISSING_DEADLINE", 
          message: "Deadline date is required for timeline goals." 
        });
      } else if (isNaN(Date.parse(input.deadlineDate))) {
        errors.push({ 
          field: `inputs[${index}].deadlineDate`, 
          code: "INVALID_DATE", 
          message: "Deadline date must be a valid ISO-8601 date." 
        });
      }
      
      if (input.completionDate && isNaN(Date.parse(input.completionDate))) {
        errors.push({ 
          field: `inputs[${index}].completionDate`, 
          code: "INVALID_DATE", 
          message: "Completion date must be a valid ISO-8601 date." 
        });
      }
    }

    const validUoms = ["numeric_max", "numeric_min", "percentage_max", "percentage_min", "timeline", "zero_based"];
    if (!validUoms.includes(input.uomType)) {
       errors.push({ 
         field: `inputs[${index}].uomType`, 
         code: "UNKNOWN_UOM", 
         message: `Unknown UoM type: ${input.uomType}` 
       });
    }

    // 3. Achievement Data Checks
    if (input.achievementValue === null || input.achievementValue === undefined) {
      if (input.uomType !== "timeline") {
        warnings.push({ 
          field: `inputs[${index}].achievementValue`, 
          message: "Achievement value is null. Goal will score 0 if evaluated." 
        });
      }
    }
  });

  // 4. Global Validation
  if (inputs.length > 0 && Math.abs(totalWeightage - 100) > 0.01) {
     errors.push({ 
       field: "inputs", 
       code: "WEIGHTAGE_SUM_MISMATCH", 
       message: `Total weightage across goals must equal 100. Current sum: ${totalWeightage}` 
     });
  }

  return {
    success: errors.length === 0,
    errors,
    warnings
  };
}
