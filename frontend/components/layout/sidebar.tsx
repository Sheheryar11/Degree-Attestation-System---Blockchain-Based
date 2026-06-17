'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LayoutDashboard,
  FileText,
  Upload,
  CreditCard,
  Award,
  Users,
  Settings,
  LogOut,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authApi } from '@/lib/api/auth';
import { useRouter } from 'next/navigation';

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/student/dashboard', icon: LayoutDashboard },
  { label: 'My Applications', href: '/student/applications', icon: FileText },
  { label: 'New Application', href: '/student/applications/new', icon: Upload },
  { label: 'Payments', href: '/student/payments', icon: CreditCard },
  { label: 'My Certificates', href: '/student/certificates', icon: Award },
];

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'All Applications', href: '/admin/applications', icon: FileText },
  { label: 'Blockchain Records', href: '/admin/blockchain', icon: Shield },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const NAV_BY_ROLE: Record<string, NavItem[]> = {
  STUDENT: STUDENT_NAV,
  ADMIN: ADMIN_NAV,
};

export function Sidebar() {
  const pathname = usePathname();
  const { user, clearAuth } = useAuthStore();
  const router = useRouter();
  const qc = useQueryClient();

  const logoutMutation = useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      clearAuth();
      qc.clear();
      router.push('/login');
    },
  });

  const navItems = NAV_BY_ROLE[user?.role ?? ''] ?? [];

  const activeHref = navItems
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + '/'))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Shield className="h-6 w-6 text-primary" />
        <span className="font-semibold text-sm leading-tight">Degree Attestation<br />System</span>
      </div>

      {/* Nav */}
      <ScrollArea className="flex-1 px-3 py-4">
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link key={item.href} href={item.href}>
                <span className={cn('flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors', active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground')}>
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {active && <ChevronRight className="ml-auto h-4 w-4" />}
                </span>
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      {/* User footer */}
      <div className="border-t p-4">
        <div className="mb-3 px-1">
          <p className="text-sm font-medium truncate">{user?.email}</p>
          <p className="text-xs text-muted-foreground capitalize">{user?.role?.toLowerCase()}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </aside>
  );
}
