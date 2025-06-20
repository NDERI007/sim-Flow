'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/app/lib/supabase';

type Template = {
  id: string;
  name: string;
  content: string;
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [newTemplate, setNewTemplate] = useState<Omit<Template, 'id'>>({
    name: '',
    content: '',
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchTemplates = async () => {
    const { data, error } = await supabase.from('templates').select('*');
    if (!error && data) setTemplates(data as Template[]);
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    if (!newTemplate.name || !newTemplate.content) return;
    setLoading(true);
    await supabase.from('templates').insert(newTemplate);
    setNewTemplate({ name: '', content: '' });
    await fetchTemplates();
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    await supabase.from('templates').delete().eq('id', id);
    await fetchTemplates();
    setLoading(false);
  };

  const handleEdit = async (id: string, name: string, content: string) => {
    setLoading(true);
    await supabase.from('templates').update({ name, content }).eq('id', id);
    setEditingId(null);
    await fetchTemplates();
    setLoading(false);
  };

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-fuchsia-700">Templates</h1>

      <div className="mb-6 space-y-2">
        <input
          type="text"
          placeholder="Template Name"
          value={newTemplate.name}
          onChange={(e) =>
            setNewTemplate({ ...newTemplate, name: e.target.value })
          }
          className="w-full rounded bg-gray-100 p-2"
        />
        <textarea
          placeholder="Message Content"
          value={newTemplate.content}
          onChange={(e) =>
            setNewTemplate({ ...newTemplate, content: e.target.value })
          }
          className="w-full rounded bg-gray-100 p-2"
        ></textarea>
        <button
          onClick={handleCreate}
          disabled={loading}
          className="rounded bg-fuchsia-700 px-4 py-2 text-white hover:bg-fuchsia-500"
        >
          {loading ? 'Saving...' : 'Add Template'}
        </button>
      </div>

      <ul className="space-y-4">
        {templates.map((template) => (
          <li key={template.id} className="rounded bg-white p-4 shadow">
            {editingId === template.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  defaultValue={template.name}
                  onChange={(e) => (template.name = e.target.value)}
                  className="w-full rounded bg-gray-100 p-2"
                />
                <textarea
                  defaultValue={template.content}
                  onChange={(e) => (template.content = e.target.value)}
                  className="w-full rounded bg-gray-100 p-2"
                ></textarea>
                <button
                  onClick={() =>
                    handleEdit(template.id, template.name, template.content)
                  }
                  className="mr-2 rounded bg-fuchsia-700 px-4 py-1 text-white hover:bg-fuchsia-500"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditingId(null)}
                  className="text-sm text-gray-500"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-semibold">{template.name}</h3>
                <p className="text-gray-700">{template.content}</p>
                <div className="mt-2 space-x-2">
                  <button
                    onClick={() => setEditingId(template.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
