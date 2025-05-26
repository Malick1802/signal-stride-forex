
import React from 'react';
import { Brain, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SignalAnalysisProps {
  analysisText?: string;
  analysis: string;
  isAnalysisOpen: boolean;
  onToggleAnalysis: (open: boolean) => void;
}

const SignalAnalysis = ({
  analysisText,
  analysis,
  isAnalysisOpen,
  onToggleAnalysis
}: SignalAnalysisProps) => {
  if (!analysisText && !analysis) {
    return null;
  }

  return (
    <Collapsible open={isAnalysisOpen} onOpenChange={onToggleAnalysis}>
      <CollapsibleTrigger asChild>
        <button className="w-full pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-blue-400" />
              <span className="text-blue-400">AI Analysis</span>
            </div>
            {isAnalysisOpen ? (
              <ChevronUp className="h-4 w-4 text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-400" />
            )}
          </div>
        </button>
      </CollapsibleTrigger>
      
      <CollapsibleContent className="pt-3">
        {analysisText && (
          <div className="mb-3">
            <div className="text-gray-400 text-xs mb-2">Analysis:</div>
            <div className="text-white text-xs bg-black/20 rounded p-2">
              {analysisText}
            </div>
          </div>
        )}

        {analysis && (
          <div>
            <div className="text-blue-400 text-xs mb-2">Detailed Analysis:</div>
            <div className="text-white text-xs bg-blue-500/10 rounded p-2 max-h-40 overflow-y-auto">
              {analysis}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default SignalAnalysis;
