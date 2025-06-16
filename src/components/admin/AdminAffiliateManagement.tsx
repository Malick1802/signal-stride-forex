
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Users, DollarSign, TrendingUp, Search, CheckCircle, XCircle, Edit } from 'lucide-react';
import { useAdminAffiliates } from '@/hooks/useAdminAffiliates';

export const AdminAffiliateManagement = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const { affiliates, stats, loading } = useAdminAffiliates();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
      </div>
    );
  }

  const filteredAffiliates = affiliates.filter(affiliate =>
    affiliate.affiliate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    affiliate.user_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Affiliate stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-white">{stats.totalAffiliates}</div>
            <div className="text-sm text-gray-400">Total Affiliates</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-400">{stats.activeAffiliates}</div>
            <div className="text-sm text-gray-400">Active Affiliates</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-400">${stats.totalCommissions}</div>
            <div className="text-sm text-gray-400">Total Commissions</div>
          </CardContent>
        </Card>
        <Card className="bg-black/20 border-white/10">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{stats.conversionRate}%</div>
            <div className="text-sm text-gray-400">Conversion Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Affiliate management */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Affiliate Management</CardTitle>
          <CardDescription className="text-gray-400">
            Manage affiliate applications and performance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search affiliates by code or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-black/20 border-white/20 text-white"
            />
          </div>

          <div className="border border-white/10 rounded-lg">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-gray-400">Affiliate Code</TableHead>
                  <TableHead className="text-gray-400">User</TableHead>
                  <TableHead className="text-gray-400">Status</TableHead>
                  <TableHead className="text-gray-400">Tier</TableHead>
                  <TableHead className="text-gray-400">Referrals</TableHead>
                  <TableHead className="text-gray-400">Earnings</TableHead>
                  <TableHead className="text-gray-400">Join Date</TableHead>
                  <TableHead className="text-gray-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAffiliates.map((affiliate) => (
                  <TableRow key={affiliate.id} className="border-white/10">
                    <TableCell>
                      <code className="bg-gray-800 text-emerald-400 px-2 py-1 rounded text-sm">
                        {affiliate.affiliate_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <div className="text-white">{affiliate.user_email || 'N/A'}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={affiliate.status === 'active' ? 'default' : 'secondary'}>
                        {affiliate.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-gold text-gold">
                        {affiliate.tier}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">{affiliate.total_referrals}</TableCell>
                    <TableCell className="text-emerald-400">${affiliate.total_earnings.toFixed(2)}</TableCell>
                    <TableCell className="text-gray-400">
                      {new Date(affiliate.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {affiliate.status === 'pending' && (
                          <>
                            <Button size="sm" variant="ghost" className="text-emerald-400">
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400">
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        <Button size="sm" variant="ghost" className="text-blue-400">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
