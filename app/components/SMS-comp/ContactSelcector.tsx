import { useContactGroups } from '@/app/lib/contactGroup';
import { useSmsStore } from '@/app/lib/smsStore';
import useSWR from 'swr';

const ContactGroupSelector = () => {
  const { groups, error, isLoading } = useContactGroups();
  const selectedGroups = useSmsStore((state) => state.selectedGroup);
  const toggleGroup = useSmsStore((state) => state.toggleGroup);
  const inputMethod = useSmsStore((state) => state.inputMethod);

  const shouldShow = inputMethod === 'groups' || inputMethod === 'both';
  if (!shouldShow) return null;
  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading contact groups...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-500">
        Error loading contact groups: {error.message}
      </p>
    );
  }

  if (!groups) return <p>Loading...</p>;
  if (groups.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 py-8 text-center">
        <div className="mb-2 text-4xl">📋</div>
        <p className="font-medium text-gray-500">No contact groups available</p>
        <p className="mt-1 text-sm text-gray-400">
          Create groups first to use this feature
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => {
        const isSelected = selectedGroups.some((g) => g.id === group.id);
        return (
          <label
            key={group.id}
            className={`flex cursor-pointer items-center rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
              isSelected
                ? 'border-purple-500 bg-purple-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleGroup(group)}
              className="h-4 w-4 rounded text-purple-600 focus:ring-purple-500"
            />
            <div className="ml-3">
              <div className="font-medium text-gray-900">{group.name}</div>
              <div className="text-sm text-gray-500">
                {group.contacts.length} contact
                {group.contacts.length !== 1 ? 's' : ''}
              </div>
            </div>
          </label>
        );
      })}
    </div>
  );
};

export default ContactGroupSelector;
