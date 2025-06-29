'use client';

import { useState } from 'react';

import { refreshContactGroups } from '../../lib/useContactGroups';
import { deleteContactGroup } from '../../lib/contactGroup';
import ContactGroupCard from './contact-card';

interface Contact {
  name: string;
  phone: string;
}

interface GroupWithContacts {
  id: string;
  name: string;
  contacts: Contact[];
}

export default function ContactGroupList({
  groups,
}: {
  groups: GroupWithContacts[];
}) {
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const handleDelete = async (id: string) => {
    setDeletingIds((prev) => new Set(prev).add(id));

    const { success } = await deleteContactGroup(id);

    setDeletingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

    if (success) {
      refreshContactGroups();
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <ContactGroupCard
          key={group.id}
          id={group.id}
          name={group.name}
          contacts={group.contacts}
          onDelete={() => handleDelete(group.id)}
          isDeleting={deletingIds.has(group.id)}
        />
      ))}
    </div>
  );
}
