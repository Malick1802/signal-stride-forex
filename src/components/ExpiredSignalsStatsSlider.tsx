import React, { useCallback, useEffect } from 'react';
import { TrendingUp, Target, Clock, Award } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselApi } from '@/components/ui/carousel';

interface ExpiredSignalsStats {
  totalSignals: number;
  completedSignalsCount: number;
  winRate: number;
  avgPips: number;
  avgDuration: string;
  wins: number;
  losses: number;
}

interface ExpiredSignalsStatsSliderProps {
  stats: ExpiredSignalsStats;
}

const ExpiredSignalsStatsSlider: React.FC<ExpiredSignalsStatsSliderProps> = ({ stats }) => {
  const [api, setApi] = React.useState<CarouselApi>();
  const [isPaused, setIsPaused] = React.useState(false);

  // Stats array matching the DashboardStats format
  const statsCards = [
    {
      id: 'completed',
      icon: TrendingUp,
      value: `${stats.completedSignalsCount}`,
      label: 'Completed Signals',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10'
    },
    {
      id: 'winrate',
      icon: Award,
      value: `${stats.winRate}%`,
      label: 'Win Rate',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10'
    },
    {
      id: 'avgpips',
      icon: Target,
      value: `${stats.avgPips >= 0 ? '+' : ''}${stats.avgPips} pips`,
      label: 'Avg Pips',
      color: stats.avgPips >= 0 ? 'text-emerald-400' : 'text-red-400',
      bgColor: stats.avgPips >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
    },
    {
      id: 'avgduration',
      icon: Clock,
      value: stats.avgDuration,
      label: 'Avg Duration',
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
    <>
      {/* Desktop Grid Layout */}
      <div className="hidden md:block px-4 py-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {statsCards.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <Card key={stat.id} className={`${stat.bgColor} backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200`}>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-3">
                    <IconComponent className={`h-8 w-8 ${stat.color}`} />
                    <div>
                      <div className={`text-2xl font-bold ${stat.color} mb-1`}>
                        {stat.value}
                      </div>
                      <div className="text-gray-300 text-sm font-medium">
                        {stat.label}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Mobile Carousel Layout */}
      <div className="md:hidden px-4 py-4">
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
            {statsCards.map((stat) => {
              const IconComponent = stat.icon;
              return (
                <CarouselItem key={stat.id} className="pl-4 basis-full">
                  <Card className={`${stat.bgColor} backdrop-blur-sm border-white/10 hover:bg-white/10 transition-all duration-200 h-full`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center space-x-4">
                        <div className={`p-3 rounded-xl bg-white/10`}>
                          <IconComponent className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="flex-1 text-center">
                          <div className={`text-2xl font-bold ${stat.color} mb-1`}>
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
    </>
  );
};

export default ExpiredSignalsStatsSlider;