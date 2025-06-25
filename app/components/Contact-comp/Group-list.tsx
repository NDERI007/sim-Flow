'use client';

import type { ContactGroup } from '@/app/lib/smsStore';
import ContactGroupCard from './contact-card';

interface Props {
  groups: ContactGroup[];
  onEdit: (group: ContactGroup) => void;
}

export default function ContactGroupList({ groups, onEdit }: Props) {
  if (!groups || groups.length === 0) {
    return <p>No contact groups found.</p>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <ContactGroupCard key={group.id} group={group} onEdit={onEdit} />
      ))}
    </div>
  );
}
