import Typography from '@mui/material/Typography';
import AdminUserList from '../components/adminList';

export default function AdminUsersPage() {
  return (
    <main style={{ padding: '2rem' }}>
      <Typography variant="h4" gutterBottom>
        User Management
      </Typography>
      <AdminUserList />
    </main>
  );
}
