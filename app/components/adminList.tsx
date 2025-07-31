'use client';

import { useState } from 'react';
import axios from 'axios';
import useSWR from 'swr';
import {
  Grid,
  Paper,
  Typography,
  TextField,
  Button,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

interface UserRecord {
  id: string;
  email: string;
  sender_id: string | null;
  quota: number;
}

const Item = styled(Paper)(({ theme }) => ({
  backgroundColor: '#2a263d',
  padding: theme.spacing(3),
  color: '#fff',
  textAlign: 'left',
  border: '1px solid #3f3b56',
}));

export default function AdminUserList() {
  const { data, mutate, error, isLoading } = useSWR<UserRecord[]>(
    '/api/users',
    async () => {
      const res = await axios.get('/api/users');
      return res.data;
    },
  );

  const [saving, setSaving] = useState<string | null>(null);
  const [editedUsers, setEditedUsers] = useState<
    Record<string, Partial<UserRecord>>
  >({});

  const handleEdit = (
    id: string,
    key: keyof UserRecord,
    value: string | number,
  ) => {
    setEditedUsers((prev) => ({
      ...prev,
      [id]: { ...prev[id], [key]: value },
    }));
  };

  const updateUser = async (id: string) => {
    const updated = editedUsers[id];
    if (!updated) return;

    setSaving(id);

    try {
      await axios.patch(`/api/admin/users/${id}`, {
        sender_id: updated.sender_id,
        quota: updated.quota,
      });

      await mutate();
      setEditedUsers((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    } catch (err) {
      console.error('Failed to update user:', err);
    } finally {
      setSaving(null);
    }
  };

  if (isLoading) return <CircularProgress sx={{ color: '#fff', m: 4 }} />;
  if (error)
    return (
      <Typography color="error" sx={{ m: 4 }}>
        Error loading users
      </Typography>
    );

  // ... (imports and component logic remain the same)

  return (
    <Grid
      container
      spacing={3}
      sx={{ flexGrow: 1, backgroundColor: '#1e1b2e', p: 4 }}
    >
      {data?.map((user) => {
        const edits = editedUsers[user.id] || user;

        return (
          // ✨ This is the updated line for Grid v2
          <Grid key={user.id} size={{ xs: 12, md: 6 }}>
            <Item elevation={3}>
              <Typography variant="h6" gutterBottom>
                {user.email}
              </Typography>

              <TextField
                fullWidth
                label="Sender ID"
                margin="normal"
                value={edits.sender_id ?? ''}
                onChange={(e) =>
                  handleEdit(user.id, 'sender_id', e.target.value)
                }
                slotProps={{ inputLabel: { style: { color: '#aaa' } } }}
              />

              <TextField
                fullWidth
                label="Quota Remaining"
                type="number"
                margin="normal"
                value={edits.quota ?? ''}
                onChange={(e) =>
                  handleEdit(user.id, 'quota', Number(e.target.value))
                }
                slotProps={{ inputLabel: { style: { color: '#aaa' } } }}
              />

              <Button
                variant="contained"
                onClick={() => updateUser(user.id)}
                disabled={saving === user.id}
                sx={{
                  mt: 2,
                  backgroundColor: '#6d28d9',
                  '&:hover': {
                    backgroundColor: '#7c3aed',
                  },
                }}
              >
                {saving === user.id ? 'Saving...' : 'Save'}
              </Button>
            </Item>
          </Grid>
        );
      })}
    </Grid>
  );
}
