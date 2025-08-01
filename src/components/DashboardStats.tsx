
import React, { useCallback, useEffect } from 'react';
import { TrendingUp, Bot, Clock, Target } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';

interface DashboardStatsProps {
  activeSignalsCount?: number;
  totalSignalsCount?: number;
  avgConfidence?: number;
  lastUpdateTime?: string;
  isAutomated?: boolean;
  loading?: boolean;
}

const DashboardStats = ({ 
  activeSignalsCount = 0, 
  totalSignalsCount = 20, 
  avgConfidence = 0, 
  lastUpdateTime = "Never",
  isAutomated = true,
  loading = false
}: DashboardStatsProps) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [isPaused, setIsPaused] = React.useState(false);

  // Fixed stats array with unique data for each card
  const stats = [
    {
      id: 'active-signals',
      icon: TrendingUp,
      value: loading ? '...' : `${activeSignalsCount}/${totalSignalsCount}`,
      label: 'Active Signals',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'confidence',
      icon: Target,
      value: loading ? '...' : `${avgConfidence}%`,
      label: 'Avg Confidence',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'automation',
      icon: Bot,
      value: loading ? '...' : (isAutomated ? 'AI' : 'Manual'),
      label: 'Mode',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10'
    },
    {
      id: 'last-update',
      icon: Clock,
      value: loading ? '...' : (lastUpdateTime === 'Never' ? 'Never' : lastUpdateTime),
      label: 'Last Update',
      color: 'text-orange-400',
      bgColor: 'bg-orange-500/10'
    }
  ];

  const scrollNext = useCallback(() => {
    if (api && !isPaused) {
      api.scrollNext();
    }
  }, [api, isPaused]);

  useEffect(() => {
    if (!api) return;

    const intervalId = setInterval(scrollNext, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }, [api, scrollNext]);

  const handleMouseEnter = () => setIsPaused(true);
  const handleMouseLeave = () => setIsPaused(false);
  const handleTouchStart = () => setIsPaused(true);
  const handleTouchEnd = () => {
    // Resume after a short delay to allow for swipe gestures
    setTimeout(() => setIsPaused(false), 1000);
  };

  return (
    <div className="px-4 py-4">
      <Carousel
        setApi={setApi}
        opts={{
          align: "start",
          loop: true,
        }}
        className="w-full"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <CarouselContent className="-ml-4">
          {stats.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <CarouselItem key={stat.id} className="pl-4 basis-full">
                <Card className={`${stat.bgColor} backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200 h-full`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-center space-x-4">
                      <div className={`p-3 rounded-xl bg-white/10`}>
                        <IconComponent className={`h-6 w-6 ${stat.color} ${loading ? 'animate-pulse' : ''}`} />
                      </div>
                      <div className="flex-1 text-center">
                        <div className={`text-2xl font-bold ${stat.color} mb-1 ${loading ? 'animate-pulse' : ''}`}>
                          {stat.value}
                        </div>
                        <div className="text-gray-300 text-sm font-medium">
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
      </Carousel>
    </div>
  );
};

export default DashboardStats;
