'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Header } from '@/components/layout/header';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { usersApi } from '@/lib/api/users';
import { toast } from 'sonner';
import { Users, ShieldCheck, ShieldOff } from 'lucide-react';

const ROLES = ['', 'STUDENT', 'OFFICER', 'REGISTRAR', 'ADMIN'];

type UserRow = {
  id: string;
  email: string;
  role: string;
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  _count?: { applications: number };
};

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState('');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersApi.list(roleFilter ? { role: roleFilter } : {}),
  });

  const users: UserRow[] = data?.data?.data ?? [];

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: { role?: string; isActive?: boolean } }) =>
      usersApi.update(id, updates),
    onSuccess: () => {
      toast.success('User updated');
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (err: { response?: { data?: { message?: string } } }) =>
      toast.error(err?.response?.data?.message ?? 'Update failed'),
  });

  const toggleActive = (user: UserRow) =>
    updateMutation.mutate({ id: user.id, updates: { isActive: !user.isActive } });

  const changeRole = (user: UserRow, role: string) =>
    updateMutation.mutate({ id: user.id, updates: { role } });

  return (
    <div className="flex flex-col h-full">
      <Header title="User Management" />
      <div className="flex-1 overflow-auto p-6 space-y-4">

        <div className="flex gap-2 flex-wrap">
          {ROLES.map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                roleFilter === r
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border hover:bg-accent'
              }`}
            >
              {r || 'All Roles'}
            </button>
          ))}
        </div>

        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-sm text-muted-foreground">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center">
                <Users className="mx-auto h-10 w-10 text-muted-foreground mb-3" />
                <p className="text-sm font-medium">No users found</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email Verified</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Applications</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Joined</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3">{user.email}</td>
                      <td className="px-4 py-3">
                        <select
                          value={user.role}
                          onChange={(e) => changeRole(user, e.target.value)}
                          className="text-xs border rounded px-1.5 py-1 bg-background"
                          disabled={updateMutation.isPending}
                        >
                          {['STUDENT', 'OFFICER', 'REGISTRAR', 'ADMIN'].map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={user.isEmailVerified ? 'default' : 'secondary'}>
                          {user.isEmailVerified ? 'Verified' : 'Pending'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{user._count?.applications ?? 0}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleActive(user)}
                          disabled={updateMutation.isPending}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? (
                            <ShieldOff className="h-4 w-4 text-destructive" />
                          ) : (
                            <ShieldCheck className="h-4 w-4 text-green-600" />
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
