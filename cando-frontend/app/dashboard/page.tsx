'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/common/Card/Card';

export default function DashboardPage() {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">$24,560.00</p>
            <p className="text-sm text-gray-500">+20.1% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">1,234</p>
            <p className="text-sm text-gray-500">+15% from last month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">25</p>
            <p className="text-sm text-gray-500">5 due today</p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4 border-b pb-4 last:border-0">
                  <div className="h-10 w-10 rounded-full bg-gray-200" />
                  <div>
                    <p className="font-medium">User Activity {i}</p>
                    <p className="text-sm text-gray-500">Completed task #{i}</p>
                  </div>
                  <div className="ml-auto text-sm text-gray-500">
                    {i} hour{i !== 1 ? 's' : ''} ago
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
} 