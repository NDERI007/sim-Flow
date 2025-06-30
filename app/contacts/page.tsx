'use client';

import { useState } from 'react';
import ContactGroupForm from '../components/Contact-comp/contact-form';
import ContactGroupList from '../components/Contact-comp/Group-list';
import { useGroupedContacts } from '../lib/contactGroup';

import ContactUploader from '../components/Contact-comp/contact-uploader';
import Modal from '../components/modal';

export default function ContactGroupsPage() {
  const { groups, error, isLoading } = useGroupedContacts();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<any>(null);
  const [showUploader, setShowUploader] = useState(false);

  const handleEditGroup = (group: any) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingGroup(null);
    setShowForm(true);
  };

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-gray-200">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-white">Contact Groups</h1>
        <div className="flex gap-3">
          <button
            onClick={handleCreateNew}
            className="rounded-xl bg-pink-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 hover:bg-pink-800"
          >
            + New Group
          </button>
          <button
            onClick={() => setShowUploader(true)}
            className="rounded-xl bg-pink-900 px-5 py-2 text-sm font-semibold text-white shadow-md transition hover:scale-105 hover:bg-pink-800"
          >
            📤 Upload Contacts
          </button>
        </div>
      </header>

      <Modal isOpen={showUploader} onClose={() => setShowUploader(false)}>
        <h2 className="mb-4 text-xl font-bold text-gray-300">
          Import Contacts
        </h2>
        <ContactUploader onComplete={() => setShowUploader(false)} />
      </Modal>

      {showForm && (
        <ContactGroupForm
          editingGroup={editingGroup}
          setEditingGroup={setEditingGroup}
          onClose={() => setShowForm(false)}
        />
      )}

      {isLoading && (
        <p className="mt-4 animate-pulse text-gray-400">
          Loading contact groups...
        </p>
      )}

      {error && (
        <p className="mt-4 font-medium text-pink-400">
          ❌ Error: {error.message}
        </p>
      )}

      {!isLoading && !error && groups?.length > 0 && (
        <ContactGroupList groups={groups} onEdit={handleEditGroup} />
      )}

      {!isLoading && !error && groups?.length === 0 && (
        <p className="mt-4 text-sm text-gray-400">
          You don’t have any groups yet.
        </p>
      )}
    </main>
  );
}
