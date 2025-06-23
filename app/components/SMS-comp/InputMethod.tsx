import React from 'react';

const INPUT_METHODS = [
  { label: 'Manual Entry', value: 'manual' },
  { label: 'Contact Groups', value: 'groups' },
  { label: 'Both', value: 'both' },
];

interface Props {
  inputMethod: string;
  onMethodChange: (method: string) => void;
}

const InputMethodSelector = ({ inputMethod, onMethodChange }: Props) => {
  return (
    <div className="flex items-center justify-center gap-4">
      {INPUT_METHODS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            inputMethod === value
              ? 'border-purple-600 bg-purple-600 text-white'
              : 'border-gray-300 bg-white text-gray-800 hover:bg-gray-100'
          } `}
          onClick={() => onMethodChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default InputMethodSelector;
