
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Copy, ExternalLink, Plus, Eye, MousePointerClick } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';
import { useToast } from '@/hooks/use-toast';

export const ReferralLinksManager = () => {
  const { affiliateData, referralLinks, createReferralLink } = useAffiliate();
  const { toast } = useToast();
  const [campaignName, setCampaignName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName.trim()) return;

    setCreating(true);
    const success = await createReferralLink(campaignName);
    if (success) {
      setCampaignName('');
    }
    setCreating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Referral link copied to clipboard.",
    });
  };

  const getReferralUrl = (linkCode: string) => {
    return `${window.location.origin}?ref=${linkCode}`;
  };

  return (
    <div className="space-y-6">
      {/* Create New Link */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Plus className="h-5 w-5 mr-2" />
            Create New Referral Link
          </CardTitle>
          <CardDescription className="text-gray-400">
            Create trackable referral links for different campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateLink} className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="campaign" className="text-gray-400">Campaign Name</Label>
              <Input
                id="campaign"
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g., Social Media, Email Campaign"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                required
              />
            </div>
            <div className="flex items-end">
              <Button 
                type="submit" 
                disabled={creating || !campaignName.trim()}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                {creating ? 'Creating...' : 'Create Link'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Default Referral Link */}
      {affiliateData && (
        <Card className="bg-black/20 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Default Referral Link</CardTitle>
            <CardDescription className="text-gray-400">
              Your main affiliate link using your affiliate code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="flex-1 p-3 bg-gray-800 rounded border text-white font-mono text-sm">
                {`${window.location.origin}?ref=${affiliateData.affiliate_code}`}
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => copyToClipboard(`${window.location.origin}?ref=${affiliateData.affiliate_code}`)}
                className="border-white/20 text-gray-400 hover:text-white"
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => window.open(`${window.location.origin}?ref=${affiliateData.affiliate_code}`, '_blank')}
                className="border-white/20 text-gray-400 hover:text-white"
              >
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Links List */}
      {referralLinks.length > 0 && (
        <Card className="bg-black/20 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Your Referral Links</CardTitle>
            <CardDescription className="text-gray-400">
              Track performance of your referral campaigns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {referralLinks.map((link) => (
                <div key={link.id} className="p-4 bg-gray-800/50 rounded-lg border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="text-white font-medium">{link.campaign_name || 'Unnamed Campaign'}</h4>
                      <p className="text-xs text-gray-400">Created {new Date(link.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge variant={link.is_active ? 'default' : 'secondary'} className={link.is_active ? 'bg-emerald-500' : ''}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-3">
                    <div className="flex-1 p-2 bg-gray-900 rounded border text-white font-mono text-sm">
                      {getReferralUrl(link.link_code)}
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => copyToClipboard(getReferralUrl(link.link_code))}
                      className="border-white/20 text-gray-400 hover:text-white"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open(getReferralUrl(link.link_code), '_blank')}
                      className="border-white/20 text-gray-400 hover:text-white"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center text-blue-400">
                      <MousePointerClick className="h-4 w-4 mr-1" />
                      <span>{link.clicks} clicks</span>
                    </div>
                    <div className="flex items-center text-emerald-400">
                      <Eye className="h-4 w-4 mr-1" />
                      <span>{link.conversions} conversions</span>
                    </div>
                    <div className="text-gray-400">
                      Rate: {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
