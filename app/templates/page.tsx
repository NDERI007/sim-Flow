'use client';

import { useState } from 'react';
import useSWR from 'swr';
import {
  fetchTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from '../lib/templates';
import TemplateForm from '../components/template/templateForm';
import TemplateCard from '../components/template/templateCard';

import { useAuthStore } from '../lib/AuthStore';

type Template = {
  id: string;
  name: string;
  content: string;
};

export default function TemplatesPage() {
  const accessToken = useAuthStore((s) => s.accessToken);
  const initialized = useAuthStore((s) => s.initialized);
  const [loading, setLoading] = useState(false);

  const {
    data: templates = [],
    mutate,
    isLoading: templatesLoading,
  } = useSWR(
    accessToken && initialized ? ['templates', accessToken] : null,
    ([, token]) => fetchTemplates(token),
    { revalidateOnFocus: false },
  );

  const handleCreate = async (name: string, content: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await createTemplate(accessToken, { name, content });
      await mutate();
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (id: string, name: string, content: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await updateTemplate(accessToken, id, { name, content });
      await mutate();
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!accessToken) return;
    setLoading(true);
    try {
      await deleteTemplate(accessToken, id);
      await mutate();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-950 p-6 text-gray-100">
      <h1 className="mb-6 text-2xl font-bold text-gray-400">Templates</h1>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TemplateForm onCreate={handleCreate} loading={loading} />

        {templatesLoading || !initialized ? (
          <p className="col-span-full text-gray-400">Loading templates...</p>
        ) : (
          templates.map((template: Template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onUpdate={handleUpdate}
              onDelete={handleDelete}
            />
          ))
        )}
      </div>
    </main>
  );
}
