'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/lib/supabase';

interface ContactGroup {
  id: string;
  name: string;
  contacts: string[];
  created_at: string;
  user_id: string;
}

export default function ContactGroupsPage() {
  const [groups, setGroups] = useState<ContactGroup[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ContactGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    contacts: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [user, setUser] = useState<any>(null);

  // Get user once and store it
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  // Memoize fetchGroups to prevent unnecessary re-calls
  const fetchGroups = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('contact_groups')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setGroups(data);
    }
  }, [user]);

  // Fetch groups when user is available
  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user, fetchGroups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!user) {
      setMessage('❌ User not authenticated');
      setLoading(false);
      return;
    }

    const contacts = formData.contacts
      .split(/[,\n]+/)
      .map((num) => num.trim())
      .filter(Boolean);

    try {
      if (editingGroup) {
        const { error } = await supabase
          .from('contact_groups')
          .update({
            name: formData.name,
            contacts,
          })
          .eq('id', editingGroup.id);

        if (error) throw error;
        setMessage('✅ Group updated successfully!');
      } else {
        const { error } = await supabase.from('contact_groups').insert({
          name: formData.name,
          contacts,
          user_id: user.id,
        });

        if (error) throw error;
        setMessage('✅ Group created successfully!');
      }

      setFormData({ name: '', contacts: '' });
      setShowAddForm(false);
      setEditingGroup(null);

      // Refetch groups after successful operation
      await fetchGroups();
    } catch (error: any) {
      setMessage(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (group: ContactGroup) => {
    setEditingGroup(group);
    setFormData({
      name: group.name,
      contacts: group.contacts.join('\n'),
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this group?')) return;

    const { error } = await supabase
      .from('contact_groups')
      .delete()
      .eq('id', id);

    if (!error) {
      setMessage('✅ Group deleted successfully!');
      await fetchGroups();
    } else {
      setMessage(`❌ Error deleting group: ${error.message}`);
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingGroup(null);
    setFormData({ name: '', contacts: '' });
  };

  // Clear message after 5 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-800">
            Contact Groups
          </h1>
          <p className="text-gray-600">
            Manage your contact groups for easy SMS sending
          </p>
        </div>

        {/* Add Group Button */}
        {!showAddForm && (
          <div className="mb-6 flex justify-center">
            <button
              onClick={() => setShowAddForm(true)}
              className="transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-pink-700"
            >
              + Add New Group
            </button>
          </div>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <div className="mb-8">
            <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl">
              <h2 className="mb-6 text-2xl font-semibold text-gray-800">
                {editingGroup ? 'Edit Group' : 'Create New Group'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Group Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter group name"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Phone contacts
                  </label>
                  <textarea
                    value={formData.contacts}
                    onChange={(e) =>
                      setFormData({ ...formData, contacts: e.target.value })
                    }
                    className="h-32 w-full rounded-xl border border-gray-300 px-4 py-3 transition-all duration-200 outline-none focus:border-transparent focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter phone contacts (one per line or comma separated)"
                    required
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Add one number per line or separate with commas
                  </p>
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 transform rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:from-purple-700 hover:to-pink-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loading
                      ? 'Saving...'
                      : editingGroup
                        ? 'Update Group'
                        : 'Create Group'}
                  </button>

                  <button
                    type="button"
                    onClick={cancelForm}
                    className="flex-1 transform rounded-xl bg-gray-500 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="mb-6 text-center">
            <p
              className={`text-lg font-medium ${message.includes('✅') ? 'text-green-600' : 'text-red-600'}`}
            >
              {message}
            </p>
          </div>
        )}

        {/* Groups List */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <div
              key={group.id}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-xl transition-shadow duration-300 hover:shadow-2xl"
            >
              <div className="mb-4">
                <h3 className="mb-2 text-xl font-semibold text-gray-800">
                  {group.name}
                </h3>
                <p className="text-sm text-gray-500">
                  {group.contacts.length} contact
                  {group.contacts.length !== 1 ? 's' : ''}
                </p>
              </div>

              <div className="mb-4">
                <h4 className="mb-2 text-sm font-medium text-gray-700">
                  contacts:
                </h4>
                <div className="max-h-32 overflow-y-auto rounded-lg bg-gray-50 p-3">
                  {group.contacts.map((number, index) => (
                    <div key={index} className="mb-1 text-sm text-gray-600">
                      {number}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(group)}
                  className="flex-1 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-blue-600"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(group.id)}
                  className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-colors duration-200 hover:bg-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {groups.length === 0 && !showAddForm && (
          <div className="py-12 text-center">
            <div className="mb-4 text-gray-400">
              <svg
                className="mx-auto h-16 w-16"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <p className="mb-4 text-xl text-gray-500">No contact groups yet</p>
            <p className="text-gray-400">
              Create your first group to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
