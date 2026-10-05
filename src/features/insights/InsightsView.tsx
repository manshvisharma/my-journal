import React from 'react';
import { InsightsSheet } from './InsightsSheet';

interface InsightsViewProps {
  onBack: () => void;
  onSelectDateFilter?: (dateStr: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ onBack, onSelectDateFilter }) => {
  return (
    <InsightsSheet
      isOpen={true}
      onClose={onBack}
      onSelectDateFilter={onSelectDateFilter}
    />
  );
};
