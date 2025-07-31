import axios from 'axios';

export const fetchTemplates = async () => {
  const res = await axios.get('/api/templates', {});
  return res.data;
};

export const createTemplate = async (payload: {
  label: string;
  content: string;
}) => {
  await axios.post('/api/templates', payload, {});
};

export const updateTemplate = async (
  id: string,
  updates: { label: string; content: string },
) => {
  await axios.patch(`/api/templates/${id}`, updates, {});
};

export const deleteTemplate = async (id: string) => {
  await axios.delete(`/api/templates/${id}`, {});
};
