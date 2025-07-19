
import React from 'react';

interface ErrorMessageProps {
  message: string;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="w-full max-w-2xl p-4 mb-6 bg-red-700 border border-red-900 text-white rounded-lg shadow-lg" role="alert">
      <p className="font-semibold">Error:</p>
      <p>{message}</p>
    </div>
  );
};

export default ErrorMessage;
