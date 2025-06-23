import React from 'react';
import { ValidationResult } from '../../lib/smsStore';

const ValidationSummary = ({
  validationResult,
}: {
  validationResult: ValidationResult | null;
}) => {
  if (!validationResult || validationResult.totalRecipients === 0) return null;

  const { totalRecipients, totalSegments } = validationResult;

  return (
    <div className="rounded-xl bg-gray-50 p-4">
      <h3 className="mb-3 flex items-center font-medium text-gray-800">
        <span className="mr-2">📊</span>
        Summary
      </h3>
      <div className="grid grid-cols-2 gap-4 text-sm">
        <div>
          <span className="text-gray-600">Recipients:</span>
          <span className="ml-2 font-medium text-green-600">
            {totalRecipients}
          </span>
        </div>
        <div>
          <span className="text-gray-600">Total segments:</span>
          <span className="ml-2 font-medium">{totalSegments}</span>
        </div>
      </div>
    </div>
  );
};

export default ValidationSummary;
