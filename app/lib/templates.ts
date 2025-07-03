import axios from 'axios';

export const fetchTemplates = async (accessToken: string) => {
  const res = await axios.get('/api/templates', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return res.data;
};

export const createTemplate = async (
  accessToken: string,
  payload: { name: string; content: string },
) => {
  await axios.post('/api/templates', payload, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export const updateTemplate = async (
  accessToken: string,
  id: string,
  updates: { name: string; content: string },
) => {
  await axios.patch(`/api/templates/${id}`, updates, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};

export const deleteTemplate = async (accessToken: string, id: string) => {
  await axios.delete(`/api/templates/${id}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
};
