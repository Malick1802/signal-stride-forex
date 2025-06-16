
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DollarSign, CreditCard, AlertCircle } from 'lucide-react';
import { useAffiliate } from '@/hooks/useAffiliate';
import { supabase } from '@/integrations/supabase/client';

interface PayoutRequest {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  requested_at: string;
  processed_at: string | null;
  notes: string | null;
}

export const PayoutManager = () => {
  const { affiliateData, commissions, requestPayout } = useAffiliate();
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('stripe');
  const [requesting, setRequesting] = useState(false);

  const availableBalance = commissions
    .filter(c => c.status === 'approved')
    .reduce((sum, c) => sum + c.amount, 0);

  const minimumPayout = 50; // $50 minimum payout

  useEffect(() => {
    fetchPayouts();
  }, [affiliateData]);

  const fetchPayouts = async () => {
    if (!affiliateData) return;

    try {
      const { data, error } = await supabase
        .from('affiliate_payouts')
        .select('*')
        .eq('affiliate_id', affiliateData.id)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching payouts:', error);
        return;
      }

      setPayouts(data || []);
    } catch (error) {
      console.error('Error fetching payouts:', error);
    }
  };

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const payoutAmount = parseFloat(amount);
    
    if (!payoutAmount || payoutAmount < minimumPayout) {
      return;
    }

    if (payoutAmount > availableBalance) {
      return;
    }

    setRequesting(true);
    const success = await requestPayout(payoutAmount, paymentMethod);
    if (success) {
      setAmount('');
      await fetchPayouts();
    }
    setRequesting(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500';
      case 'processing':
        return 'bg-blue-500';
      case 'pending':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Available Balance</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">${availableBalance.toFixed(2)}</div>
            <p className="text-xs text-gray-400 mt-1">Ready for payout</p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Total Paid</CardTitle>
            <CreditCard className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${payouts.filter(p => p.status === 'completed').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {payouts.filter(p => p.status === 'completed').length} payments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-black/20 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">Pending Payouts</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${payouts.filter(p => p.status === 'pending' || p.status === 'processing').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              {payouts.filter(p => p.status === 'pending' || p.status === 'processing').length} requests
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Payout */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Request Payout</CardTitle>
          <CardDescription className="text-gray-400">
            Request a payout of your available commission balance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleRequestPayout} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="amount" className="text-gray-400">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={minimumPayout}
                  max={availableBalance}
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Min: $${minimumPayout}`}
                  className="bg-white/5 border-white/10 text-white placeholder:text-gray-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available: ${availableBalance.toFixed(2)} | Minimum: ${minimumPayout}
                </p>
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-gray-400">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="stripe">Stripe Transfer</SelectItem>
                    <SelectItem value="paypal">PayPal</SelectItem>
                    <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {availableBalance < minimumPayout && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  You need at least ${minimumPayout} in available balance to request a payout.
                </AlertDescription>
              </Alert>
            )}

            <Button 
              type="submit" 
              disabled={requesting || availableBalance < minimumPayout || !amount || parseFloat(amount) < minimumPayout}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {requesting ? 'Requesting...' : 'Request Payout'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card className="bg-black/20 border-white/10">
        <CardHeader>
          <CardTitle className="text-white">Payout History</CardTitle>
          <CardDescription className="text-gray-400">
            Track your payout requests and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No payout requests yet</p>
              <p className="text-sm text-gray-500 mt-2">
                Request your first payout when you reach the minimum balance
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {payouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-white/10">
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="text-white font-medium">${payout.amount.toFixed(2)}</h4>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${getStatusColor(payout.status)} text-white border-0`}
                      >
                        {payout.status}
                      </Badge>
                      <Badge variant="outline" className="text-xs border-white/20 text-gray-400">
                        {payout.payment_method}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">
                      Requested: {new Date(payout.requested_at).toLocaleDateString()}
                      {payout.processed_at && (
                        <> • Processed: {new Date(payout.processed_at).toLocaleDateString()}</>
                      )}
                    </p>
                    {payout.notes && (
                      <p className="text-xs text-gray-500 mt-1">{payout.notes}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
