import { InputMethod, useSmsStore } from '../../lib/smsStore';

const INPUT_METHODS: { label: string; value: InputMethod }[] = [
  { label: 'Manual Entry', value: 'manual' },
  { label: 'ContactGroup & manual entry', value: 'groups' },
];

const InputMethodSelector = () => {
  const inputMethod = useSmsStore((s) => s.inputMethod);
  const setInputMethod = useSmsStore((s) => s.setInputMethod);

  return (
    <div className="flex items-center justify-center gap-4">
      {INPUT_METHODS.map(({ label, value }) => (
        <button
          key={value}
          type="button"
          className={`rounded-full border px-4 py-2 text-sm font-medium transition-colors duration-150 ${
            inputMethod === value
              ? 'border-pink-900 bg-pink-900 text-white'
              : 'border-gray-500 bg-white text-gray-800 hover:bg-gray-100'
          } `}
          onClick={() => setInputMethod(value)}
        >
          {label}
        </button>
      ))}
    </div>
  );
};

export default InputMethodSelector;
