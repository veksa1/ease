/**
 * Calendar Integration Screen - Ticket 019
 * 
 * Allows users to connect their calendar to ALINE for context-aware predictions
 */

import React, { useState, useEffect } from 'react';
import { Calendar, CheckCircle2, AlertCircle, Loader2, ChevronRight, X } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { calendarService } from '../services/calendarService';

interface CalendarIntegrationProps {
  userId: string;
  onClose?: () => void;
}

type CalendarProvider = 'google' | 'outlook' | 'apple' | 'other';

export function CalendarIntegration({ userId, onClose }: CalendarIntegrationProps) {
  const [step, setStep] = useState<'select' | 'connect' | 'success'>('select');
  const [selectedProvider, setSelectedProvider] = useState<CalendarProvider | null>(null);
  const [calendarUrl, setCalendarUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastVerified, setLastVerified] = useState<string | null>(null);

  // Check connection status on mount
  useEffect(() => {
    checkConnectionStatus();
  }, [userId]);

  const checkConnectionStatus = async () => {
    try {
      const status = await calendarService.getCalendarStatus(userId);
      setIsConnected(status.connected);
      setLastVerified(status.lastVerifiedAt || null);
      if (status.connected) {
        setStep('success');
      }
    } catch (err) {
      console.error('Failed to check calendar status:', err);
    }
  };

  const handleProviderSelect = (provider: CalendarProvider) => {
    setSelectedProvider(provider);
    setStep('connect');
    setError(null);
  };

  const handleTestAndSave = async () => {
    if (!calendarUrl.trim()) {
      setError('Please enter a calendar URL');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await calendarService.saveCalendarConnection(userId, calendarUrl);
      setLastVerified(response.lastVerifiedAt || null);
      setIsConnected(true);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect calendar');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await calendarService.deleteCalendarConnection(userId);
      setIsConnected(false);
      setCalendarUrl('');
      setStep('select');
      setSelectedProvider(null);
      setLastVerified(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect calendar');
    } finally {
      setLoading(false);
    }
  };

  const renderProviderButton = (
    provider: CalendarProvider,
    label: string,
    icon: React.ReactNode
  ) => (
    <button
      onClick={() => handleProviderSelect(provider)}
      className="w-full p-4 bg-white border-2 border-gray-200 rounded-2xl hover:border-[#6366F1] hover:bg-gray-50 transition-all flex items-center justify-between group"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center group-hover:bg-[#6366F1]/10">
          {icon}
        </div>
        <span className="font-medium text-gray-900">{label}</span>
      </div>
      <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-[#6366F1]" />
    </button>
  );

  if (step === 'select') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Connect Calendar</h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <p className="text-gray-600 mb-6">
          Connect your calendar to help ALINE understand tomorrow's context and provide better predictions.
        </p>

        <div className="space-y-3">
          {renderProviderButton(
            'google',
            'Google Calendar',
            <Calendar className="w-5 h-5 text-[#4285F4]" />
          )}
          {renderProviderButton(
            'outlook',
            'Outlook / Office 365',
            <Calendar className="w-5 h-5 text-[#0078D4]" />
          )}
          {renderProviderButton(
            'apple',
            'Apple iCloud',
            <Calendar className="w-5 h-5 text-gray-600" />
          )}
          {renderProviderButton(
            'other',
            'Other Calendar',
            <Calendar className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            <strong>Privacy Note:</strong> Your calendar URL is stored securely and never shared. ALINE only reads event times and titles to provide context.
          </p>
        </div>
      </div>
    );
  }

  if (step === 'connect' && selectedProvider) {
    const instructions = calendarService.getProviderInstructions(selectedProvider);

    return (
      <div className="p-6 max-w-md mx-auto">
        <button
          onClick={() => setStep('select')}
          className="mb-4 text-gray-600 hover:text-gray-900 flex items-center gap-2"
        >
          ← Back
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{instructions.title}</h2>
        <p className="text-gray-600 mb-6">Follow these steps to get your calendar URL:</p>

        <ol className="space-y-3 mb-6">
          {instructions.steps.map((step, index) => (
            <li key={index} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-[#6366F1] text-white rounded-full flex items-center justify-center text-sm font-medium">
                {index + 1}
              </span>
              <span className="text-gray-700">{step}</span>
            </li>
          ))}
        </ol>

        <div className="space-y-4">
          <div>
            <Label htmlFor="calendar-url">Calendar URL</Label>
            <Input
              id="calendar-url"
              type="url"
              placeholder="https://... or webcal://..."
              value={calendarUrl}
              onChange={(e) => setCalendarUrl(e.target.value)}
              className="mt-1"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium mb-1">Connection Failed</p>
                <p className="text-red-800">{error}</p>
                {error.includes('Network') && (
                  <p className="text-red-700 mt-2 text-xs">
                    💡 <strong>Tip:</strong> Make sure the calendar URL is public and accessible. 
                    For Google Calendar, ensure &quot;Make available to public&quot; is enabled in sharing settings.
                  </p>
                )}
              </div>
            </div>
          )}

          <Button
            onClick={handleTestAndSave}
            disabled={loading || !calendarUrl.trim()}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              'Test & Save'
            )}
          </Button>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Calendar Connected</h2>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex flex-col items-center py-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Successfully Connected!</h3>
          <p className="text-gray-600 text-center mb-1">
            Your calendar is now connected to ALINE.
          </p>
          {lastVerified && (
            <p className="text-sm text-gray-500">
              Last verified: {new Date(lastVerified).toLocaleString()}
            </p>
          )}
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleDisconnect}
            variant="outline"
            className="w-full"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect Calendar'
            )}
          </Button>

          {onClose && (
            <Button onClick={onClose} className="w-full">
              Done
            </Button>
          )}
        </div>

        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-900">
            ALINE will now use your calendar events to provide more accurate "tomorrow" predictions.
          </p>
        </div>
      </div>
    );
  }

  return null;
}
