import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useTradingSettings } from '@/hooks/useArbitrageData';
import { useToast } from '@/hooks/use-toast';

export default function QuickSettings() {
  const { settings, updateSettings, isUpdating } = useTradingSettings('default-user');
  const { toast } = useToast();
  
  const [localSettings, setLocalSettings] = useState({
    minProfitThreshold: '1.5',
    maxGasPrice: '50',
    autoExecute: false,
  });

  useEffect(() => {
    if (settings) {
      setLocalSettings({
        minProfitThreshold: settings.minProfitThreshold || '1.5',
        maxGasPrice: settings.maxGasPrice || '50',
        autoExecute: settings.autoExecute || false,
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    toast({
      title: "Settings Updated",
      description: "Your trading settings have been saved successfully.",
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Quick Settings</h3>
      </div>
      <div className="p-6 space-y-4">
        <div>
          <label className="text-sm text-muted-foreground">Min Profit Threshold</label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={localSettings.minProfitThreshold}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, minProfitThreshold: e.target.value }))}
              className="flex-1"
              data-testid="input-min-profit-threshold"
            />
            <span className="font-mono text-sm w-12">{localSettings.minProfitThreshold}%</span>
          </div>
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">Max Gas Price (Gwei)</label>
          <div className="mt-1">
            <input
              type="number"
              value={localSettings.maxGasPrice}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, maxGasPrice: e.target.value }))}
              className="w-full bg-input border border-border rounded px-3 py-2 text-sm font-mono"
              data-testid="input-max-gas-price"
            />
          </div>
        </div>
        
        <div>
          <label className="text-sm text-muted-foreground">Auto-execute</label>
          <div className="mt-1 flex items-center space-x-2">
            <input
              type="checkbox"
              checked={localSettings.autoExecute}
              onChange={(e) => setLocalSettings(prev => ({ ...prev, autoExecute: e.target.checked }))}
              className="rounded"
              data-testid="input-auto-execute"
            />
            <span className="text-sm">Enable automatic execution</span>
          </div>
        </div>
        
        <Button
          onClick={handleSave}
          disabled={isUpdating}
          className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
          data-testid="button-save-settings"
        >
          {isUpdating ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}
