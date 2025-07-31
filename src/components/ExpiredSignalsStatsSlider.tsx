import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

interface ExpiredSignalsStats {
  totalSignals: number;
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
  const [currentIndex, setCurrentIndex] = useState(0);

  const statsCards = [
    {
      id: 'completed',
      value: stats.totalSignals,
      label: 'Completed Signals',
      subLabel: 'Finished trades',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-400/20'
    },
    {
      id: 'winrate',
      value: `${stats.winRate}%`,
      label: 'Win Rate',
      subLabel: `${stats.wins} wins / ${stats.totalSignals} total`,
      color: 'text-blue-400',
      bgColor: 'bg-blue-400/20'
    },
    {
      id: 'avgpips',
      value: `${stats.avgPips >= 0 ? '+' : ''}${stats.avgPips} pips`,
      label: 'Avg Pips',
      subLabel: 'Per signal',
      color: stats.avgPips >= 0 ? 'text-emerald-400' : 'text-red-400',
      bgColor: stats.avgPips >= 0 ? 'bg-emerald-400/20' : 'bg-red-400/20'
    },
    {
      id: 'avgduration',
      value: stats.avgDuration,
      label: 'Avg Duration',
      subLabel: 'Per signal',
      color: 'text-orange-400',
      bgColor: 'bg-orange-400/20'
    }
  ];

  const nextSlide = () => {
    setCurrentIndex((prev) => (prev + 1) % statsCards.length);
  };

  const prevSlide = () => {
    setCurrentIndex((prev) => (prev - 1 + statsCards.length) % statsCards.length);
  };

  const currentCard = statsCards[currentIndex];

  return (
    <div className="relative">
      {/* Main Stats Card */}
      <Card className="bg-white/5 backdrop-blur-sm border-white/10 mx-8">
        <CardContent className="p-6">
          <div className="text-center space-y-3">
            <div className={`text-3xl font-bold ${currentCard.color}`}>
              {currentCard.value}
            </div>
            <div className="text-gray-300 text-lg font-medium">
              {currentCard.label}
            </div>
            <div className={`text-sm ${currentCard.color}`}>
              {currentCard.subLabel}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <Button
        variant="ghost"
        size="icon"
        onClick={prevSlide}
        className="absolute left-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:bg-white/10"
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={nextSlide}
        className="absolute right-0 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white hover:bg-white/10"
      >
        <ChevronRight className="h-5 w-5" />
      </Button>

      {/* Dots Indicator */}
      <div className="flex justify-center space-x-2 mt-4">
        {statsCards.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`w-2 h-2 rounded-full transition-colors ${
              index === currentIndex 
                ? 'bg-white' 
                : 'bg-white/30'
            }`}
          />
        ))}
      </div>
    </div>
  );
};

export default ExpiredSignalsStatsSlider;