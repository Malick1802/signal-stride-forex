
import React from 'react';
import { TrendingUp, Bot, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';

interface DashboardStatsProps {
  activeSignalsCount?: number;
  totalSignalsCount?: number;
  avgConfidence?: number;
  lastUpdateTime?: string;
  isAutomated?: boolean;
}

const DashboardStats = ({ 
  activeSignalsCount = 2, 
  totalSignalsCount = 20, 
  avgConfidence = 80, 
  lastUpdateTime = "7:01:58 PM",
  isAutomated = true 
}: DashboardStatsProps) => {
  const stats = [
    {
      id: 'active-signals',
      icon: TrendingUp,
      value: `${activeSignalsCount}/${totalSignalsCount}`,
      label: 'Active Signals',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'confidence',
      icon: Target,
      value: `${avgConfidence}%`,
      label: 'Avg Confidence',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'automation',
      icon: Bot,
      value: 'AI',
      label: 'Automated',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 'last-update',
      icon: Clock,
      value: lastUpdateTime,
      label: 'Last Update',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    }
  ];

  return (
    <div className="px-4 py-4">
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full max-w-full"
      >
        <CarouselContent className="-ml-2 md:-ml-4">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <CarouselItem key={stat.id} className="pl-2 md:pl-4 basis-4/5 md:basis-1/2 lg:basis-1/4">
                <Card className={`${stat.bgColor} backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200 h-full`}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg bg-white/10`}>
                        <IconComponent className={`h-5 w-5 ${stat.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-lg font-bold ${stat.color} truncate`}>
                          {stat.value}
                        </div>
                        <div className="text-gray-300 text-xs truncate">
                          {stat.label}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="hidden md:flex -left-6 bg-white/10 border-white/20 text-white hover:bg-white/20" />
        <CarouselNext className="hidden md:flex -right-6 bg-white/10 border-white/20 text-white hover:bg-white/20" />
      </Carousel>
    </div>
  );
};

export default DashboardStats;
