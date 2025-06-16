
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Mail, Phone, Bell } from 'lucide-react';

export const AdminCommunication = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <MessageSquare className="h-5 w-5 text-blue-400" />
              <div>
                <div className="text-2xl font-bold text-white">24</div>
                <div className="text-sm text-gray-400">New Messages</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Mail className="h-5 w-5 text-emerald-400" />
              <div>
                <div className="text-2xl font-bold text-white">156</div>
                <div className="text-sm text-gray-400">Emails Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Phone className="h-5 w-5 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-white">89</div>
                <div className="text-sm text-gray-400">SMS Sent</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Bell className="h-5 w-5 text-purple-400" />
              <div>
                <div className="text-2xl font-bold text-white">12</div>
                <div className="text-sm text-gray-400">Announcements</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Communication Center</CardTitle>
          <CardDescription className="text-gray-400">
            Manage notifications and user communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-gray-400">Communication tools interface coming soon...</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
