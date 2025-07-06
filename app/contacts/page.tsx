'use client';

import { useState } from 'react';
import ContactGroupForm from '../components/Contact-comp/contact-form';
import ContactGroupList from '../components/Contact-comp/Group-list';
import { useGroupedContacts } from '../lib/contactGroup';
import ContactUploader from '../components/Contact-comp/contact-uploader';
import Modal from '../components/modal';
import { ContactGroup } from '../lib/smsStore';

export default function ContactGroupsPage() {
  const { groups, error, isLoading } = useGroupedContacts();
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup>(null);
  const [showUploader, setShowUploader] = useState(false);

  const handleEditGroup = (group: ContactGroup) => {
    setEditingGroup(group);
    setShowForm(true);
  };

  const handleCreateNew = () => {
    setEditingGroup(null);
    setShowForm(true);
  };

  return (
    <main className="min-h-screen w-full bg-gray-950 px-4 py-10 text-gray-100">
      <div className="mx-auto w-full max-w-4xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-3xl font-bold">Contact Groups</h1>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCreateNew}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 shadow transition hover:bg-gray-700"
            >
              + New Group
            </button>
            <button
              onClick={() => setShowUploader(true)}
              className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-gray-200 shadow transition hover:bg-gray-700"
            >
              Upload Contacts
            </button>
          </div>
        </header>

        <Modal isOpen={showUploader} onClose={() => setShowUploader(false)}>
          <h2 className="mb-4 text-xl font-semibold text-gray-100">
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
          <p className="mt-4 font-medium text-red-400">
            Error: {error.message}
          </p>
        )}

        {!isLoading && !error && groups?.length > 0 && (
          <ContactGroupList groups={groups} onEdit={handleEditGroup} />
        )}

        {!isLoading && !error && groups?.length === 0 && (
          <p className="mt-4 text-sm text-gray-500">
            You don’t have any groups yet.
          </p>
        )}
      </div>
    </main>
  );
}
