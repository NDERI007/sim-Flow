'use client';

import { useState } from 'react';
import { deleteContactGroup } from '../../lib/contactGroup';
import ContactGroupCard from './contact-card';
import { ContactGroup } from '../../lib/smsStore';
import { mutate } from 'swr';

interface ContactGroupListProps {
  groups: ContactGroup[];
  onEdit?: (group: ContactGroup) => void;
}

export default function ContactGroupList({
  groups,
  onEdit,
}: ContactGroupListProps) {
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
      await mutate('rpc:contacts-with-groups');
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {groups.map((group) => (
        <ContactGroupCard
          key={group.id}
          id={group.id}
          group_name={group.group_name}
          contacts={group.contacts}
          onDelete={() => handleDelete(group.id)}
          isDeleting={deletingIds.has(group.id)}
          onEdit={onEdit ? () => onEdit(group) : undefined}
        />
      ))}
    </div>
  );
}
